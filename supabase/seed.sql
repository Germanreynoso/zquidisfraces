-- =============================================================================
-- ZiquiDisfraces · Datos de prueba
-- Ejecutar DESPUÉS de las migraciones (SQL Editor de Supabase o `supabase db reset`).
-- Idempotente: si ya hay disfraces cargados, no hace nada.
-- Las fechas son relativas a hoy, así el dashboard siempre muestra datos vigentes.
-- Usa las funciones internas app_private.*_impl para que el stock y los movimientos queden consistentes.
-- =============================================================================

create or replace function pg_temp.d(p_codigo text) returns uuid language sql stable as $$
  select id from public.disfraces where codigo = p_codigo and activo;
$$;

create or replace function pg_temp.c(p_dni text) returns uuid language sql stable as $$
  select id from public.clientes where dni = p_dni;
$$;

-- Construye p_items a partir de 'CODIGO:cantidad'.
create or replace function pg_temp.items(variadic p text[]) returns jsonb language sql stable as $$
  select jsonb_agg(jsonb_build_object(
    'disfraz_id', pg_temp.d(split_part(x, ':', 1)),
    'cantidad', split_part(x, ':', 2)::integer
  ))
  from unnest(p) x;
$$;

-- Devolución completa en buen estado.
create or replace function pg_temp.todo_ok(p_alquiler_id uuid) returns jsonb language sql stable as $$
  select jsonb_agg(jsonb_build_object('alquiler_item_id', ai.id, 'cantidad_ok', ai.cantidad))
  from public.alquiler_items ai where ai.alquiler_id = p_alquiler_id;
$$;

create or replace function pg_temp.saldo(p_alquiler_id uuid) returns numeric language sql stable as $$
  select saldo_pendiente from public.alquileres where id = p_alquiler_id;
$$;

do $$
declare
  h date := public.hoy();
  v uuid;
  v_item uuid;
begin
  if exists (select 1 from public.disfraces) then
    raise notice 'Seed omitido: ya existen disfraces cargados';
    return;
  end if;

  -- ---------------------------------------------------------------------------
  -- Disfraces
  -- ---------------------------------------------------------------------------
  insert into public.disfraces
    (codigo, nombre, categoria, talle, cantidad_total, stock_minimo, precio_alquiler, precio_reposicion, descripcion)
  values
    ('SH-001', 'Hombre Araña clásico',       'superheroes', 'M',            3, 1, 25000, 150000, 'Traje completo con máscara y guantes.'),
    ('SH-002', 'Hombre Araña clásico',       'superheroes', 'Infantil 6-8', 4, 1, 18000,  90000, 'Traje infantil con máscara.'),
    ('SH-003', 'Mujer Maravilla',            'superheroes', 'S',            2, 1, 28000, 160000, 'Corset, falda, tiara y brazaletes.'),
    ('SH-004', 'Batman Caballero Oscuro',    'superheroes', 'L',            2, 1, 30000, 180000, 'Traje con músculos, capa y máscara.'),
    ('SH-005', 'Capitán América',            'superheroes', 'L',            1, 1, 27000, 150000, 'Incluye escudo de goma espuma.'),
    ('PR-001', 'Elsa (Frozen)',              'princesas',   'Infantil 4-6', 5, 2, 16000,  80000, 'Vestido celeste con capa de tul.'),
    ('PR-002', 'Blancanieves',               'princesas',   'Infantil 6-8', 3, 1, 15000,  75000, 'Vestido con vincha.'),
    ('PR-003', 'Bella (La Bella y la Bestia)', 'princesas', 'M',            2, 1, 26000, 140000, 'Vestido amarillo largo.'),
    ('PR-004', 'Cenicienta',                 'princesas',   'S',            1, 1, 26000, 140000, 'Vestido de gala con guantes.'),
    ('TE-001', 'Drácula',                    'terror',      'L',            2, 1, 22000, 110000, 'Capa con cuello alto y chaleco.'),
    ('TE-002', 'Bruja',                      'terror',      'Único',        6, 2, 14000,  60000, 'Vestido negro y sombrero.'),
    ('TE-003', 'Zombie',                     'terror',      'M',            3, 1, 18000,  70000, 'Ropa desgarrada con maquillaje sugerido.'),
    ('TE-004', 'Payaso siniestro',           'terror',      'L',            2, 1, 24000, 120000, 'Traje con peluca y máscara.'),
    ('AN-001', 'Dinosaurio inflable',        'animales',    'Adulto',       2, 1, 32000, 200000, 'Inflable con ventilador a pilas.'),
    ('AN-002', 'León',                       'animales',    'Infantil 2-4', 3, 1, 14000,  65000, 'Enterito de polar con capucha.'),
    ('AN-003', 'Vaca',                       'animales',    'Adulto',       2, 1, 16000,  70000, 'Enterito con capucha.'),
    ('HI-001', 'Cleopatra',                  'historicos',  'S',            2, 1, 27000, 150000, 'Vestido, collar y tocado.'),
    ('HI-002', 'Gaucho',                     'historicos',  'L',            3, 1, 20000,  95000, 'Bombacha, faja, pañuelo y sombrero.'),
    ('HI-003', 'Dama antigua (1810)',        'historicos',  'M',            4, 2, 22000, 120000, 'Vestido colonial con peineta.'),
    ('HI-004', 'Granadero',                  'historicos',  'M',            2, 1, 24000, 130000, 'Casaca, pantalón y morrión.'),
    ('PF-001', 'Bombero',                    'profesiones', 'Infantil 6-8', 3, 1, 15000,  70000, 'Chaqueta, pantalón y casco.'),
    ('PF-002', 'Médica',                     'profesiones', 'M',            2, 1, 15000,  60000, 'Ambo y estetoscopio de juguete.'),
    ('PF-003', 'Policía',                    'profesiones', 'L',            2, 1, 17000,  75000, 'Camisa, gorra y placa.'),
    ('IN-001', 'Pirata',                     'infantiles',  'Infantil 4-6', 4, 1, 13000,  55000, 'Chaleco, pañuelo y parche.'),
    ('IN-002', 'Hada',                       'infantiles',  'Infantil 4-6', 4, 1, 13000,  55000, 'Vestido con alas y varita.'),
    ('IN-003', 'Astronauta',                 'infantiles',  'Infantil 6-8', 2, 1, 16000,  80000, 'Enterito con casco.'),
    ('AD-001', 'Marilyn Monroe',             'adultos',     'M',            1, 1, 25000, 120000, 'Vestido blanco y peluca rubia.'),
    ('AD-002', 'Elvis Presley',              'adultos',     'L',            1, 1, 25000, 130000, 'Mono blanco con capa y anteojos.'),
    ('AD-003', 'Años 20 (Charleston)',       'adultos',     'S',            3, 1, 21000, 100000, 'Vestido con flecos y vincha.'),
    ('OT-001', 'Mascota de cumpleaños',      'otros',       'Único',        1, 1, 45000, 250000, 'Botarga completa para animación.');

  -- ---------------------------------------------------------------------------
  -- Clientes
  -- ---------------------------------------------------------------------------
  insert into public.clientes (nombre, apellido, dni, telefono, email, direccion, notas)
  values
    ('Lucía',     'Fernández', '30111222', '11 5555-0101', 'lucia.fernandez@example.com', 'Av. Rivadavia 1234, CABA', 'Cliente frecuente, prefiere WhatsApp.'),
    ('Martín',    'Gómez',     '28999333', '11 5555-0102', 'martin.gomez@example.com',    'Calle 7 456, La Plata',     null),
    ('Sofía',     'Rodríguez', '35444555', '11 5555-0103', null,                          'Belgrano 890, Quilmes',     'Organiza eventos escolares.'),
    ('Juan',      'Pérez',     '25666777', '11 5555-0104', 'juan.perez@example.com',      'San Martín 22, Lanús',      null),
    ('Valentina', 'López',     '40123456', '11 5555-0105', 'valen.lopez@example.com',     'Mitre 1500, Avellaneda',    null),
    ('Diego',     'Martínez',  '33222111', '11 5555-0106', null,                          'Moreno 77, Banfield',       'Pidió factura en la última visita.'),
    ('Camila',    'García',    '38777888', '11 5555-0107', 'cami.garcia@example.com',     'Alsina 300, Lomas',         null),
    ('Nicolás',   'Sánchez',   '29888999', '11 5555-0108', 'nico.sanchez@example.com',    'Sarmiento 45, Temperley',   null),
    ('Florencia', 'Romero',    '36555444', '11 5555-0109', null,                          'Laprida 1200, Adrogué',     'Devolvió con atraso una vez.'),
    ('Tomás',     'Díaz',      '42333222', '11 5555-0110', 'tomas.diaz@example.com',      'Colón 60, Burzaco',         null),
    ('Agustina',  'Álvarez',   '37111000', '11 5555-0111', 'agus.alvarez@example.com',    'Espora 900, Longchamps',    null),
    ('Federico',  'Torres',    '31000999', '11 5555-0112', null,                          'Pueyrredón 15, Glew',       null);

  -- ---------------------------------------------------------------------------
  -- Historial: alquileres ya devueltos (alimentan reportes de ingresos y ranking)
  -- ---------------------------------------------------------------------------
  v := app_private.crear_alquiler_impl(pg_temp.c('30111222'), h - 55, pg_temp.items('SH-001:1', 'PR-001:2'), 20000, 'efectivo', 'Cumpleaños infantil', h - 58);
  perform app_private.registrar_devolucion_impl(v, pg_temp.todo_ok(v), h - 55, 0, 0, null, pg_temp.saldo(v), 'efectivo');

  v := app_private.crear_alquiler_impl(pg_temp.c('28999333'), h - 48, pg_temp.items('TE-001:1', 'TE-002:2'), 15000, 'transferencia', null, h - 50);
  perform app_private.registrar_devolucion_impl(v, pg_temp.todo_ok(v), h - 47, 0, 0, 'Devolvió un día tarde', pg_temp.saldo(v), 'transferencia');

  v := app_private.crear_alquiler_impl(pg_temp.c('35444555'), h - 38, pg_temp.items('HI-003:4', 'HI-002:3'), 60000, 'transferencia', 'Acto escolar 25 de Mayo', h - 41);
  perform app_private.registrar_devolucion_impl(v, pg_temp.todo_ok(v), h - 38, 0, 0, null, pg_temp.saldo(v), 'transferencia');

  v := app_private.crear_alquiler_impl(pg_temp.c('30111222'), h - 30, pg_temp.items('SH-002:2', 'IN-001:2'), 20000, 'efectivo', null, h - 33);
  perform app_private.registrar_devolucion_impl(v, pg_temp.todo_ok(v), h - 30, 0, 0, null, pg_temp.saldo(v), 'efectivo');

  v := app_private.crear_alquiler_impl(pg_temp.c('25666777'), h - 26, pg_temp.items('AN-001:1'), 10000, 'tarjeta', 'Fiesta de egresados', h - 28);
  perform app_private.registrar_devolucion_impl(v, pg_temp.todo_ok(v), h - 26, 0, 0, null, pg_temp.saldo(v), 'tarjeta');

  -- Devolución con daños y un faltante (genera mantenimiento, extraviado y cargos).
  v := app_private.crear_alquiler_impl(pg_temp.c('36555444'), h - 20, pg_temp.items('TE-003:2', 'IN-002:2'), 10000, 'efectivo', null, h - 22);
  select id into v_item from public.alquiler_items where alquiler_id = v and disfraz_id = pg_temp.d('TE-003');
  perform app_private.registrar_devolucion_impl(
    v,
    jsonb_build_array(
      jsonb_build_object('alquiler_item_id', v_item, 'cantidad_ok', 1, 'cantidad_danada', 1, 'observaciones', 'Manga descosida'),
      jsonb_build_object(
        'alquiler_item_id', (select id from public.alquiler_items where alquiler_id = v and disfraz_id = pg_temp.d('IN-002')),
        'cantidad_ok', 1, 'cantidad_faltante', 1, 'observaciones', 'No devolvió las alas'
      )
    ),
    h - 18, 8000, 55000, 'Se cobró reparación y reposición', 0, 'efectivo'
  );
  perform app_private.registrar_pago_impl(v, 50000, 'efectivo', 'cargo_extra', h - 18, 'Pago parcial de cargos');

  v := app_private.crear_alquiler_impl(pg_temp.c('38777888'), h - 14, pg_temp.items('PR-003:1', 'AD-003:2'), 30000, 'transferencia', null, h - 16);
  perform app_private.registrar_devolucion_impl(v, pg_temp.todo_ok(v), h - 14, 0, 0, null, pg_temp.saldo(v), 'transferencia');

  v := app_private.crear_alquiler_impl(pg_temp.c('29888999'), h - 9, pg_temp.items('SH-004:1', 'SH-003:1'), 25000, 'efectivo', 'Pareja para fiesta temática', h - 11);
  perform app_private.registrar_devolucion_impl(v, pg_temp.todo_ok(v), h - 9, 0, 0, null, pg_temp.saldo(v), 'efectivo');

  v := app_private.crear_alquiler_impl(pg_temp.c('30111222'), h - 5, pg_temp.items('PR-001:1', 'AN-002:1'), 10000, 'efectivo', null, h - 7);
  perform app_private.registrar_devolucion_impl(v, pg_temp.todo_ok(v), h - 5, 0, 0, null, pg_temp.saldo(v), 'efectivo');

  -- ---------------------------------------------------------------------------
  -- Alquileres activos
  -- ---------------------------------------------------------------------------
  -- Atrasados
  perform app_private.crear_alquiler_impl(pg_temp.c('36555444'), h - 3, pg_temp.items('TE-004:1'), 10000, 'efectivo', null, h - 6);
  perform app_private.crear_alquiler_impl(pg_temp.c('31000999'), h - 1, pg_temp.items('HI-001:1', 'AD-001:1'), 20000, 'transferencia', null, h - 4);
  -- Vencen hoy / mañana
  perform app_private.crear_alquiler_impl(pg_temp.c('40123456'), h, pg_temp.items('PR-004:1'), 10000, 'efectivo', null, h - 2);
  perform app_private.crear_alquiler_impl(pg_temp.c('33222111'), h + 1, pg_temp.items('SH-001:2', 'SH-002:1'), 30000, 'tarjeta', 'Cumpleaños temático Marvel', h - 1);
  -- En curso
  perform app_private.crear_alquiler_impl(pg_temp.c('42333222'), h + 3, pg_temp.items('AN-003:1', 'PF-001:2'), 0, 'efectivo', null, h);
  perform app_private.crear_alquiler_impl(pg_temp.c('37111000'), h + 4, pg_temp.items('OT-001:1'), 20000, 'transferencia', 'Animación de cumpleaños', h);
  perform app_private.crear_alquiler_impl(pg_temp.c('30111222'), h + 2, pg_temp.items('TE-002:3', 'TE-001:1'), 15000, 'efectivo', null, h);

  -- ---------------------------------------------------------------------------
  -- Reservas futuras
  -- ---------------------------------------------------------------------------
  perform app_private.crear_reserva_impl(pg_temp.c('35444555'), h + 2, h + 4, pg_temp.items('PR-001:3', 'IN-002:1'), 'confirmada', 'Acto escolar');
  perform app_private.crear_reserva_impl(pg_temp.c('28999333'), h + 6, h + 8, pg_temp.items('AD-002:1', 'AD-001:1'), 'pendiente', 'Fiesta años 50');
  perform app_private.crear_reserva_impl(pg_temp.c('25666777'), h + 10, h + 12, pg_temp.items('AN-001:2'), 'confirmada', null);
  perform app_private.crear_reserva_impl(pg_temp.c('38777888'), h + 1, h + 2, pg_temp.items('SH-005:1'), 'pendiente', 'Confirmar por WhatsApp');
  perform app_private.crear_reserva_impl(pg_temp.c('40123456'), h + 15, h + 17, pg_temp.items('HI-003:2', 'HI-004:2'), 'pendiente', null);

  -- ---------------------------------------------------------------------------
  -- Ajustes de stock: mantenimiento y extravío fuera de alquileres
  -- ---------------------------------------------------------------------------
  perform app_private.ajustar_stock_impl(pg_temp.d('PF-003'), 'a_mantenimiento', 1, 'Cierre roto');
  perform app_private.ajustar_stock_impl(pg_temp.d('IN-003'), 'extraviado', 1, 'No se encuentra en depósito');

  raise notice 'Seed aplicado correctamente';
end;
$$;
