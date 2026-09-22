"""
Genera el manual de usuario en PDF: docs/manual-de-usuario.pdf

    python scripts/manual-pdf.py

El contenido vive acá abajo, en ESTRUCTURA: editá el texto y volvé a correr el script.
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    ListFlowable,
    ListItem,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "docs" / "manual-de-usuario.pdf"

APP = "ZiquiDisfraces"
VERSION = "Versión 1.0 · septiembre de 2026"

VIOLETA = colors.HexColor("#6D28D9")
VIOLETA_CLARO = colors.HexColor("#F5F3FF")
FUCSIA = colors.HexColor("#BE1B7B")
TINTA = colors.HexColor("#1F2033")
GRIS = colors.HexColor("#5B5B66")
BORDE = colors.HexColor("#E3E1EA")

# -----------------------------------------------------------------------------
# Estilos
# -----------------------------------------------------------------------------
base = getSampleStyleSheet()

E = {
    "titulo": ParagraphStyle(
        "titulo", parent=base["Title"], fontName="Helvetica-Bold", fontSize=30,
        leading=34, textColor=TINTA, spaceAfter=6, alignment=0,
    ),
    "subtitulo": ParagraphStyle(
        "subtitulo", parent=base["Normal"], fontName="Helvetica", fontSize=13,
        leading=18, textColor=GRIS, spaceAfter=18,
    ),
    "h1": ParagraphStyle(
        "h1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=16,
        leading=20, textColor=VIOLETA, spaceBefore=16, spaceAfter=8,
    ),
    "h2": ParagraphStyle(
        "h2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=11.5,
        leading=15, textColor=TINTA, spaceBefore=10, spaceAfter=4,
    ),
    "p": ParagraphStyle(
        "p", parent=base["Normal"], fontName="Helvetica", fontSize=10,
        leading=14.5, textColor=TINTA, spaceAfter=6, alignment=TA_JUSTIFY,
    ),
    "li": ParagraphStyle(
        "li", parent=base["Normal"], fontName="Helvetica", fontSize=10,
        leading=14.5, textColor=TINTA, spaceAfter=3,
    ),
    "nota": ParagraphStyle(
        "nota", parent=base["Normal"], fontName="Helvetica", fontSize=9.5,
        leading=13.5, textColor=TINTA,
    ),
    "celda": ParagraphStyle(
        "celda", parent=base["Normal"], fontName="Helvetica", fontSize=9,
        leading=12.5, textColor=TINTA,
    ),
    "celda_encabezado": ParagraphStyle(
        "celda_encabezado", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=9,
        leading=12.5, textColor=colors.white,
    ),
    "indice": ParagraphStyle(
        "indice", parent=base["Normal"], fontName="Helvetica", fontSize=10.5,
        leading=17, textColor=TINTA,
    ),
}


# -----------------------------------------------------------------------------
# Constructores de bloques
# -----------------------------------------------------------------------------
def p(texto):
    return Paragraph(texto, E["p"])


def h1(texto):
    return Paragraph(texto, E["h1"])


def h2(texto):
    return Paragraph(texto, E["h2"])


def vinetas(items, numerada=False):
    return ListFlowable(
        [ListItem(Paragraph(t, E["li"]), leftIndent=12) for t in items],
        bulletType="1" if numerada else "bullet",
        start=None if numerada else "•",
        bulletFontName="Helvetica",
        bulletFontSize=9,
        bulletColor=VIOLETA if not numerada else TINTA,
        leftIndent=16,
        spaceAfter=8,
    )


def nota(texto, color=VIOLETA, fondo=VIOLETA_CLARO):
    """Recuadro de aviso con barra de color a la izquierda."""
    tabla = Table([[Paragraph(texto, E["nota"])]], colWidths=[165 * mm])
    tabla.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), fondo),
                ("LINEBEFORE", (0, 0), (0, -1), 2.5, color),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return KeepTogether([tabla, Spacer(1, 8)])


def tabla(encabezados, filas, anchos):
    datos = [[Paragraph(c, E["celda_encabezado"]) for c in encabezados]]
    datos += [[Paragraph(c, E["celda"]) for c in fila] for fila in filas]
    t = Table(datos, colWidths=[a * mm for a in anchos], repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), VIOLETA),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAF9FC")]),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return KeepTogether([t, Spacer(1, 10)])


# -----------------------------------------------------------------------------
# Contenido
# -----------------------------------------------------------------------------
SECCIONES = [
    (
        "1. Primeros pasos",
        [
            p(
                "Para entrar necesitás la dirección del sistema y tu usuario, que te entrega el administrador "
                "del negocio. Funciona igual en computadora y en celular."
            ),
            vinetas(
                [
                    "Abrí la dirección en el navegador (Chrome, Edge o Safari).",
                    "Escribí tu email y tu contraseña, y tocá <b>Ingresar</b>.",
                    "Si los datos no coinciden, aparece “Email o contraseña incorrectos”. Volvé a probar o pedí "
                    "que te reinicien la contraseña.",
                ],
                numerada=True,
            ),
            p(
                "No existe el registro público: las cuentas las crea el administrador. Si al entrar ves "
                "“Usuario pendiente de habilitación”, tu cuenta existe pero todavía no fue activada."
            ),
            nota(
                "<b>En el celular:</b> después de entrar, usá la opción del navegador <i>Agregar a pantalla de "
                "inicio</i>. Queda como una app y no tenés que escribir la dirección cada vez."
            ),
        ],
    ),
    (
        "2. Cómo se navega",
        [
            p(
                "Todas las pantallas comparten la misma estructura. En computadora el menú está siempre a la "
                "izquierda; en celular se abre con el botón de arriba a la izquierda."
            ),
            tabla(
                ["Elemento", "Para qué sirve"],
                [
                    ["Menú lateral", "Acceso a Dashboard, Calendario, Alertas, Alquileres, Devoluciones, Reservas, Clientes, Inventario, Movimientos y Reportes."],
                    ["Campana (arriba a la derecha)", "Centro de notificaciones: devoluciones vencidas, stock bajo y reservas próximas. El número rojo indica avisos urgentes."],
                    ["Sol / luna", "Cambia entre modo claro y oscuro."],
                    ["Buscador de cada listado", "Busca mientras escribís por nombre, código, DNI o teléfono, según la pantalla."],
                    ["Filtros", "Botones con el signo +: permiten filtrar por estado, categoría, talle y otros criterios. “Limpiar” los quita."],
                ],
                [38, 127],
            ),
            p(
                "Las tablas se ordenan haciendo clic en el título de la columna y se recorren con los botones "
                "de paginación del pie. En celular se deslizan hacia los costados."
            ),
        ],
    ),
    (
        "3. Inventario",
        [
            p(
                "Es el catálogo de disfraces. Cada ficha representa un modelo en un talle, con la cantidad de "
                "unidades que tenés de ese modelo."
            ),
            h2("Cargar un disfraz nuevo"),
            vinetas(
                [
                    "Entrá a <b>Inventario</b> y tocá <b>Nuevo disfraz</b>.",
                    "<b>Código:</b> un identificador corto y único, por ejemplo SH-001. Sirve para buscarlo rápido.",
                    "<b>Nombre, categoría y talle:</b> lo que ve el cliente. El talle admite texto libre "
                    "(M, Infantil 6-8, Único).",
                    "<b>Precio de alquiler:</b> lo que cobrás por alquilarlo una vez.",
                    "<b>Precio de reposición:</b> cuánto sale reponerlo. El sistema lo sugiere como cargo si el "
                    "cliente no lo devuelve.",
                    "<b>Cantidad inicial:</b> cuántas unidades tenés de ese disfraz en ese talle.",
                    "<b>Stock mínimo:</b> cuando queden menos unidades disponibles que este número, el sistema "
                    "avisa “stock bajo”.",
                    "<b>Foto:</b> arrastrá la imagen o tocá para elegirla (JPG, PNG o WEBP, hasta 5 MB).",
                ],
                numerada=True,
            ),
            h2("Estados y cantidades"),
            p(
                "El sistema reparte las unidades de cada disfraz en cuatro grupos y siempre deben sumar el total. "
                "El estado que ves en el listado se calcula solo:"
            ),
            tabla(
                ["Estado", "Qué significa"],
                [
                    ["Disponible", "Está en el local, listo para alquilar."],
                    ["Alquilado", "Está afuera, en poder de un cliente."],
                    ["Reservado", "Todo lo disponible está comprometido por reservas de hoy."],
                    ["Mantenimiento", "Volvió dañado y está en arreglo."],
                    ["Extraviado", "No volvió o se perdió."],
                ],
                [38, 127],
            ),
            h2("Ajustar stock"),
            p(
                "Las cantidades no se editan a mano: se cambian con <b>Ajustar stock</b>, desde el menú de la fila "
                "o desde la ficha del disfraz. Cada ajuste pide un motivo y queda registrado."
            ),
            tabla(
                ["Movimiento", "Cuándo usarlo"],
                [
                    ["Alta de unidades", "Compraste más unidades del mismo disfraz."],
                    ["Baja definitiva", "Descartás unidades que ya no se alquilan más."],
                    ["Enviar a mantenimiento", "Se rompió estando en el local."],
                    ["Volver de mantenimiento", "Ya está arreglado y vuelve a estar disponible."],
                    ["Marcar como extraviado", "No aparece en el depósito."],
                    ["Recuperar extraviado", "Apareció."],
                ],
                [45, 120],
            ),
            nota(
                "Todo cambio de stock queda guardado en <b>Inventario · Movimientos</b>, con fecha, cantidad, "
                "motivo y quién lo hizo. Sirve para revisar diferencias."
            ),
            h2("Ficha del disfraz"),
            p(
                "Al tocar una fila se abre la ficha: cantidades por estado, precios, quién lo tiene alquilado, "
                "qué reservas vigentes tiene y el historial completo de movimientos."
            ),
            nota(
                "Eliminar un disfraz solo lo oculta del catálogo; el historial se conserva. No se puede eliminar "
                "si hay unidades alquiladas o reservas vigentes.",
                color=FUCSIA,
                fondo=colors.HexColor("#FDF2F8"),
            ),
        ],
    ),
    (
        "4. Clientes",
        [
            p(
                "Desde <b>Clientes</b> cargás y consultás a las personas que alquilan. También podés crear un "
                "cliente sin salir del formulario de alquiler."
            ),
            vinetas(
                [
                    "<b>Nuevo cliente:</b> nombre, apellido y DNI son obligatorios; teléfono, email, dirección y "
                    "notas son opcionales. El DNI no puede repetirse.",
                    "<b>Ficha del cliente:</b> muestra cuántos alquileres tuvo, cuáles están activos, cuáles "
                    "vencidos y cuánto debe.",
                    "<b>Pestañas:</b> Activos, Vencidos, Historial completo y Reservas.",
                    "<b>Baja:</b> el cliente deja de aparecer en los listados, pero su historial se conserva.",
                ]
            ),
            nota(
                "En el listado, los clientes con alquileres vencidos aparecen marcados en rojo. Es la forma "
                "rápida de saber a quién reclamar."
            ),
        ],
    ),
    (
        "5. Alquileres",
        [
            h2("Registrar un alquiler"),
            vinetas(
                [
                    "Entrá a <b>Alquileres</b> y tocá <b>Nuevo alquiler</b>.",
                    "Elegí el cliente (podés buscarlo por nombre o DNI, o crearlo ahí mismo).",
                    "Revisá las fechas: la de alquiler es hoy y la de devolución viene sugerida a tres días. "
                    "La fecha de alquiler no puede ser futura; para eso están las reservas.",
                    "Tocá <b>Agregar disfraz</b> y elegí los disfraces. Al lado de cada uno ves cuántas unidades "
                    "hay disponibles para esas fechas.",
                    "Ajustá las cantidades con los botones + y −. El total se calcula solo.",
                    "Cargá la <b>seña</b> si el cliente adelanta dinero y elegí el medio de pago.",
                    "Tocá <b>Registrar alquiler</b>.",
                ],
                numerada=True,
            ),
            p(
                "Al confirmar, las unidades pasan de disponibles a alquiladas, la seña queda registrada como "
                "pago y el saldo pendiente se calcula solo."
            ),
            h2("Seguimiento"),
            vinetas(
                [
                    "El listado muestra el estado de cada alquiler: <b>Activo</b>, <b>Atrasado</b> (pasó la fecha "
                    "de devolución), <b>Devuelto</b> o <b>Cancelado</b>.",
                    "En la ficha del alquiler ves los disfraces, los montos, los pagos y, si ya volvió, el "
                    "detalle de la devolución.",
                    "<b>Registrar pago:</b> para cobrar el saldo antes o durante la devolución. El sistema no "
                    "deja cobrar más que lo que se debe.",
                    "<b>Cancelar alquiler:</b> solo el administrador. Devuelve las unidades al stock; se usa "
                    "cuando el cliente se arrepiente.",
                ]
            ),
        ],
    ),
    (
        "6. Devoluciones",
        [
            p(
                "La pantalla <b>Devoluciones</b> tiene dos pestañas: <b>Pendientes</b> (alquileres que todavía no "
                "volvieron, con los atrasados primero) y <b>Registradas</b> (historial)."
            ),
            h2("Registrar una devolución"),
            vinetas(
                [
                    "En Pendientes, tocá <b>Devolver</b> en el alquiler correspondiente.",
                    "Por cada disfraz indicá cuántas unidades vuelven <b>en buen estado</b>, cuántas <b>dañadas</b> "
                    "y cuántas <b>faltan</b>. Las tres cantidades tienen que sumar lo que se llevó.",
                    "Si hubo daños, cargá el <b>costo de reparación</b>.",
                    "Si falta algo, el sistema sugiere el <b>costo de reposición</b> según el precio cargado en "
                    "el disfraz. Podés cambiarlo.",
                    "Revisá el total a cobrar (saldo pendiente más cargos) e indicá cuánto cobrás en ese momento.",
                    "Confirmá.",
                ],
                numerada=True,
            ),
            p(
                "Las unidades en buen estado vuelven a estar disponibles, las dañadas pasan a mantenimiento y "
                "las faltantes quedan como extraviadas. El alquiler queda marcado como devuelto."
            ),
            nota(
                "Se registra <b>una sola devolución por alquiler</b>. Si el cliente devuelve una parte hoy y el "
                "resto mañana, conviene esperar y registrar todo junto al final."
            ),
        ],
    ),
    (
        "7. Reservas",
        [
            p(
                "Una reserva aparta disfraces para fechas futuras sin sacarlos del local. Mientras esté vigente, "
                "esas unidades no se pueden alquilar a otra persona en esas fechas."
            ),
            vinetas(
                [
                    "<b>Nueva reserva:</b> elegí cliente, fecha de inicio y de fin, y los disfraces. La fecha de "
                    "inicio tiene que ser hoy o posterior.",
                    "<b>Pendiente o confirmada:</b> las dos bloquean el stock. Confirmada significa que el cliente "
                    "ya se comprometió.",
                    "<b>Cancelar:</b> libera los disfraces para esas fechas.",
                    "<b>Registrar retiro:</b> cuando el cliente viene a buscarlos, este botón abre el alquiler "
                    "con todo precargado. Al confirmarlo, la reserva queda como “Retirada”.",
                ]
            ),
            nota(
                "El sistema nunca deja reservar más unidades de las que tenés: si no hay stock para esas fechas, "
                "avisa con el nombre del disfraz y el período en conflicto."
            ),
        ],
    ),
    (
        "8. Calendario y alertas",
        [
            p(
                "El <b>Calendario</b> muestra en un mismo lugar los alquileres activos, las reservas y las "
                "devoluciones programadas. Se puede ver por mes, por semana o como lista (en celular arranca en "
                "lista). Los atrasos aparecen en rojo y las reservas sin confirmar, con borde punteado. Tocando "
                "un evento se abre su detalle."
            ),
            p("Las <b>Alertas</b> se generan solas y se agrupan por tipo:"),
            tabla(
                ["Alerta", "Cuándo aparece"],
                [
                    ["Devolución vencida", "Pasó la fecha pactada y el disfraz no volvió."],
                    ["Devolución próxima", "Vence hoy o mañana."],
                    ["Stock bajo", "Quedan menos unidades disponibles que el mínimo configurado."],
                    ["Extraviados", "Hay unidades marcadas como extraviadas."],
                    ["Reserva próxima", "Una reserva empieza dentro de los próximos tres días."],
                ],
                [42, 123],
            ),
            p("Las alertas desaparecen solas cuando se resuelve el motivo: no hay que marcarlas como leídas."),
        ],
    ),
    (
        "9. Reportes",
        [
            p("En <b>Reportes</b> elegís un período (últimos 30 días, este mes, el mes pasado, este año o uno propio) y consultás:"),
            vinetas(
                [
                    "<b>Ingresos:</b> todo lo cobrado, separado en señas, saldos y cargos, con gráfico por día, "
                    "semana o mes.",
                    "<b>Más alquilados:</b> ranking de disfraces por unidades alquiladas.",
                    "<b>Clientes frecuentes:</b> quiénes alquilan más y cuánto facturaron.",
                    "<b>Inventario actual:</b> resumen por categoría y detalle de todo el catálogo.",
                    "<b>Atrasados:</b> alquileres vencidos con días de atraso, contacto y saldo. Es la lista para "
                    "hacer los reclamos.",
                ]
            ),
            p(
                "Cada reporte se descarga con los botones <b>Exportar PDF</b> y <b>Exportar Excel</b>. El Excel "
                "trae los números como números, listos para seguir trabajando."
            ),
        ],
    ),
    (
        "10. Usuarios y permisos",
        [
            p("Solo el administrador ve la pantalla <b>Usuarios</b>, donde crea las cuentas del equipo."),
            tabla(
                ["Rol", "Qué puede hacer"],
                [
                    [
                        "Administrador",
                        "Todo: inventario, precios, ajustes de stock, cancelar alquileres, usuarios y reportes.",
                    ],
                    [
                        "Empleado",
                        "Ve todo el sistema. Crea y edita clientes, y registra alquileres, devoluciones, pagos y "
                        "reservas. No modifica el inventario ni los precios, y no cancela alquileres.",
                    ],
                ],
                [35, 130],
            ),
            p(
                "Al crear un usuario se le asigna una contraseña temporal que conviene que cambie. Un usuario "
                "desactivado conserva su historial pero ya no puede entrar."
            ),
        ],
    ),
    (
        "11. Mensajes del sistema",
        [
            p("Cuando una operación no se puede hacer, el sistema explica por qué. Los mensajes más comunes:"),
            tabla(
                ["Mensaje", "Qué significa", "Qué hacer"],
                [
                    [
                        "Stock insuficiente para…",
                        "No hay tantas unidades en el local.",
                        "Bajá la cantidad o revisá si hay unidades en mantenimiento.",
                    ],
                    [
                        "Conflicto con reservas…",
                        "Hay stock hoy, pero esas unidades están reservadas dentro del período elegido.",
                        "Acortá la fecha de devolución o usá otro disfraz.",
                    ],
                    [
                        "Sin stock para… entre el … y el …",
                        "No alcanzan las unidades para esas fechas de reserva.",
                        "Cambiá las fechas, la cantidad o el disfraz.",
                    ],
                    [
                        "La reserva debe comenzar hoy o en una fecha futura",
                        "Se eligió una fecha pasada.",
                        "Si el cliente se lo lleva ahora, registrá un alquiler en lugar de una reserva.",
                    ],
                    [
                        "El pago supera el saldo pendiente",
                        "Se intentó cobrar más de lo que se debe.",
                        "Corregí el monto.",
                    ],
                    [
                        "Las cantidades informadas no suman lo alquilado",
                        "En la devolución, buen estado + dañadas + faltantes no da el total.",
                        "Revisá las cantidades de ese disfraz.",
                    ],
                    [
                        "No tenés permisos para realizar esta operación",
                        "La acción es solo para administradores.",
                        "Pedísela al administrador.",
                    ],
                    [
                        "Ya existe un cliente con ese DNI",
                        "El cliente ya está cargado.",
                        "Buscalo por DNI en Clientes.",
                    ],
                ],
                [45, 62, 58],
            ),
        ],
    ),
    (
        "12. Rutina diaria sugerida",
        [
            h2("Al abrir"),
            vinetas(
                [
                    "Mirá el <b>Dashboard</b>: devoluciones atrasadas y próximas a devolver.",
                    "Revisá la <b>campana</b> de alertas y llamá a quienes están vencidos.",
                    "Fijate en el <b>Calendario</b> qué reservas se retiran hoy.",
                ]
            ),
            h2("Durante el día"),
            vinetas(
                [
                    "Registrá cada alquiler en el momento, con la seña cobrada.",
                    "Registrá cada devolución apenas vuelve el disfraz: así el stock queda siempre real.",
                    "Cargá las reservas mientras hablás con el cliente, para no comprometer dos veces el mismo disfraz.",
                ]
            ),
            h2("Al cerrar"),
            vinetas(
                [
                    "Controlá que no queden devoluciones del día sin registrar.",
                    "Revisá las alertas de <b>stock bajo</b> y de <b>extraviados</b>.",
                    "Una vez por semana, mirá <b>Reportes</b> para ver ingresos y qué se alquila más.",
                ]
            ),
            nota(
                "La regla práctica: si algo pasó en el mostrador, cargalo en el sistema en ese momento. El stock, "
                "las alertas y los reportes salen de ahí."
            ),
        ],
    ),
]


# -----------------------------------------------------------------------------
# Armado del documento
# -----------------------------------------------------------------------------
def pie(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRIS)
    if doc.page > 1:
        canvas.drawString(22 * mm, 14 * mm, f"{APP} · Manual de usuario")
        canvas.drawRightString(A4[0] - 22 * mm, 14 * mm, f"Página {doc.page - 1}")
    canvas.restoreState()


def portada():
    barra = Table([[""]], colWidths=[165 * mm], rowHeights=[4])
    barra.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), VIOLETA)]))

    indice = [
        Paragraph(f"{titulo}", E["indice"]) for titulo, _ in SECCIONES
    ]

    return [
        Spacer(1, 30 * mm),
        barra,
        Spacer(1, 10),
        Paragraph("Manual de usuario", E["titulo"]),
        Paragraph(
            f"{APP} · sistema de alquiler de disfraces<br/>{VERSION}",
            E["subtitulo"],
        ),
        Spacer(1, 6),
        p(
            "Esta guía explica el uso diario del sistema: cargar el inventario, registrar alquileres, "
            "devoluciones y reservas, y seguir los cobros. Está escrita para usarla en el mostrador."
        ),
        Spacer(1, 14),
        Paragraph("Contenido", E["h2"]),
        *indice,
        PageBreak(),
    ]


def construir():
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(SALIDA),
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=20 * mm,
        bottomMargin=22 * mm,
        title=f"Manual de usuario · {APP}",
        author=APP,
        subject="Guía de uso del sistema de alquiler de disfraces",
    )
    marco = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="todas", frames=[marco], onPage=pie)])

    historia = portada()
    for titulo, bloques in SECCIONES:
        historia.append(h1(titulo))
        historia.extend(bloques)

    doc.build(historia)
    print(f"Manual generado: {SALIDA} ({SALIDA.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    construir()
