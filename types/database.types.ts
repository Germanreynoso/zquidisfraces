// Archivo generado por scripts/gen-types.ts a partir de supabase/migrations. NO editar a mano.
// Equivalente a `supabase gen types typescript --schema public`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Permite instanciar createClient con las opciones correctas
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      alquiler_items: {
        Row: {
          alquiler_id: string
          cantidad: number
          disfraz_id: string
          id: string
          precio_unitario: number
          subtotal: number | null
        }
        Insert: {
          alquiler_id: string
          cantidad: number
          disfraz_id: string
          id?: string
          precio_unitario: number
          subtotal?: never
        }
        Update: {
          alquiler_id?: string
          cantidad?: number
          disfraz_id?: string
          id?: string
          precio_unitario?: number
          subtotal?: never
        }
        Relationships: [
          {
            foreignKeyName: "alquiler_items_alquiler_id_fkey"
            columns: ["alquiler_id"]
            isOneToOne: false
            referencedRelation: "alquileres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alquiler_items_disfraz_id_fkey"
            columns: ["disfraz_id"]
            isOneToOne: false
            referencedRelation: "disfraces"
            referencedColumns: ["id"]
          },
        ]
      }
      alquileres: {
        Row: {
          cargos_adicionales: number
          cliente_id: string
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_alquiler"]
          fecha_alquiler: string
          fecha_devolucion: string
          fecha_devolucion_real: string | null
          id: string
          monto_pagado: number
          monto_total: number
          observaciones: string | null
          reserva_id: string | null
          saldo_pendiente: number | null
          sena: number
          updated_at: string
        }
        Insert: {
          cargos_adicionales?: number
          cliente_id: string
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_alquiler"]
          fecha_alquiler?: string
          fecha_devolucion: string
          fecha_devolucion_real?: string | null
          id?: string
          monto_pagado?: number
          monto_total?: number
          observaciones?: string | null
          reserva_id?: string | null
          saldo_pendiente?: never
          sena?: number
          updated_at?: string
        }
        Update: {
          cargos_adicionales?: number
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_alquiler"]
          fecha_alquiler?: string
          fecha_devolucion?: string
          fecha_devolucion_real?: string | null
          id?: string
          monto_pagado?: number
          monto_total?: number
          observaciones?: string | null
          reserva_id?: string | null
          saldo_pendiente?: never
          sena?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alquileres_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alquileres_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alquileres_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string
          direccion: string | null
          dni: string
          email: string | null
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apellido: string
          created_at?: string
          direccion?: string | null
          dni: string
          email?: string | null
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string
          direccion?: string | null
          dni?: string
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      devolucion_items: {
        Row: {
          alquiler_item_id: string
          cantidad_danada: number
          cantidad_faltante: number
          cantidad_ok: number
          devolucion_id: string
          disfraz_id: string
          id: string
          observaciones: string | null
        }
        Insert: {
          alquiler_item_id: string
          cantidad_danada?: number
          cantidad_faltante?: number
          cantidad_ok?: number
          devolucion_id: string
          disfraz_id: string
          id?: string
          observaciones?: string | null
        }
        Update: {
          alquiler_item_id?: string
          cantidad_danada?: number
          cantidad_faltante?: number
          cantidad_ok?: number
          devolucion_id?: string
          disfraz_id?: string
          id?: string
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devolucion_items_alquiler_item_id_fkey"
            columns: ["alquiler_item_id"]
            isOneToOne: false
            referencedRelation: "alquiler_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucion_items_devolucion_id_fkey"
            columns: ["devolucion_id"]
            isOneToOne: false
            referencedRelation: "devoluciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucion_items_disfraz_id_fkey"
            columns: ["disfraz_id"]
            isOneToOne: false
            referencedRelation: "disfraces"
            referencedColumns: ["id"]
          },
        ]
      }
      devoluciones: {
        Row: {
          alquiler_id: string
          costo_reparacion: number
          costo_reposicion: number
          created_at: string
          created_by: string | null
          estado_disfraz: Database["public"]["Enums"]["estado_devolucion"]
          fecha_devolucion_real: string
          id: string
          observaciones: string | null
        }
        Insert: {
          alquiler_id: string
          costo_reparacion?: number
          costo_reposicion?: number
          created_at?: string
          created_by?: string | null
          estado_disfraz?: Database["public"]["Enums"]["estado_devolucion"]
          fecha_devolucion_real?: string
          id?: string
          observaciones?: string | null
        }
        Update: {
          alquiler_id?: string
          costo_reparacion?: number
          costo_reposicion?: number
          created_at?: string
          created_by?: string | null
          estado_disfraz?: Database["public"]["Enums"]["estado_devolucion"]
          fecha_devolucion_real?: string
          id?: string
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devoluciones_alquiler_id_fkey"
            columns: ["alquiler_id"]
            isOneToOne: true
            referencedRelation: "alquileres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoluciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disfraces: {
        Row: {
          activo: boolean
          cantidad_alquilada: number
          cantidad_disponible: number
          cantidad_extraviada: number
          cantidad_mantenimiento: number
          cantidad_total: number
          categoria: Database["public"]["Enums"]["categoria_disfraz"]
          codigo: string
          deleted_at: string | null
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_disfraz"] | null
          fecha_creacion: string
          id: string
          imagen_url: string | null
          nombre: string
          precio_alquiler: number
          precio_reposicion: number
          stock_minimo: number
          talle: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          cantidad_alquilada?: number
          cantidad_disponible?: number
          cantidad_extraviada?: number
          cantidad_mantenimiento?: number
          cantidad_total?: number
          categoria?: Database["public"]["Enums"]["categoria_disfraz"]
          codigo: string
          deleted_at?: string | null
          descripcion?: string | null
          estado?: never
          fecha_creacion?: string
          id?: string
          imagen_url?: string | null
          nombre: string
          precio_alquiler?: number
          precio_reposicion?: number
          stock_minimo?: number
          talle: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          cantidad_alquilada?: number
          cantidad_disponible?: number
          cantidad_extraviada?: number
          cantidad_mantenimiento?: number
          cantidad_total?: number
          categoria?: Database["public"]["Enums"]["categoria_disfraz"]
          codigo?: string
          deleted_at?: string | null
          descripcion?: string | null
          estado?: never
          fecha_creacion?: string
          id?: string
          imagen_url?: string | null
          nombre?: string
          precio_alquiler?: number
          precio_reposicion?: number
          stock_minimo?: number
          talle?: string
          updated_at?: string
        }
        Relationships: []
      }
      movimientos_stock: {
        Row: {
          alquiler_id: string | null
          cantidad: number
          created_at: string
          devolucion_id: string | null
          disfraz_id: string
          id: string
          motivo: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id: string | null
        }
        Insert: {
          alquiler_id?: string | null
          cantidad: number
          created_at?: string
          devolucion_id?: string | null
          disfraz_id: string
          id?: string
          motivo?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id?: string | null
        }
        Update: {
          alquiler_id?: string | null
          cantidad?: number
          created_at?: string
          devolucion_id?: string | null
          disfraz_id?: string
          id?: string
          motivo?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_alquiler_fk"
            columns: ["alquiler_id"]
            isOneToOne: false
            referencedRelation: "alquileres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_devolucion_fk"
            columns: ["devolucion_id"]
            isOneToOne: false
            referencedRelation: "devoluciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_disfraz_id_fkey"
            columns: ["disfraz_id"]
            isOneToOne: false
            referencedRelation: "disfraces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          alquiler_id: string
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto: number
          observaciones: string | null
          tipo: Database["public"]["Enums"]["tipo_pago"]
        }
        Insert: {
          alquiler_id: string
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pago"]
          monto: number
          observaciones?: string | null
          tipo?: Database["public"]["Enums"]["tipo_pago"]
        }
        Update: {
          alquiler_id?: string
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pago"]
          monto?: number
          observaciones?: string | null
          tipo?: Database["public"]["Enums"]["tipo_pago"]
        }
        Relationships: [
          {
            foreignKeyName: "pagos_alquiler_id_fkey"
            columns: ["alquiler_id"]
            isOneToOne: false
            referencedRelation: "alquileres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          created_at: string
          email: string | null
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["app_rol"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email?: string | null
          id: string
          nombre?: string
          rol?: Database["public"]["Enums"]["app_rol"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["app_rol"]
          updated_at?: string
        }
        Relationships: []
      }
      reserva_items: {
        Row: {
          cantidad: number
          disfraz_id: string
          id: string
          reserva_id: string
        }
        Insert: {
          cantidad: number
          disfraz_id: string
          id?: string
          reserva_id: string
        }
        Update: {
          cantidad?: number
          disfraz_id?: string
          id?: string
          reserva_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reserva_items_disfraz_id_fkey"
            columns: ["disfraz_id"]
            isOneToOne: false
            referencedRelation: "disfraces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_items_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          alquiler_id: string | null
          cliente_id: string
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_reserva"]
          fecha_fin: string
          fecha_inicio: string
          id: string
          observaciones: string | null
          updated_at: string
        }
        Insert: {
          alquiler_id?: string | null
          cliente_id: string
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_reserva"]
          fecha_fin: string
          fecha_inicio: string
          id?: string
          observaciones?: string | null
          updated_at?: string
        }
        Update: {
          alquiler_id?: string | null
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_reserva"]
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          observaciones?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_alquiler_fk"
            columns: ["alquiler_id"]
            isOneToOne: false
            referencedRelation: "alquileres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_alertas: {
        Row: {
          descripcion: string | null
          fecha: string | null
          id: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          severidad: string | null
          tipo: string | null
          titulo: string | null
        }
        Relationships: []
      }
      v_alquileres: {
        Row: {
          cantidad_items: number | null
          cargos_adicionales: number | null
          cliente_apellido: string | null
          cliente_dni: string | null
          cliente_id: string | null
          cliente_nombre: string | null
          cliente_nombre_completo: string | null
          cliente_telefono: string | null
          created_at: string | null
          created_by: string | null
          dias_atraso: number | null
          estado: Database["public"]["Enums"]["estado_alquiler"] | null
          estado_efectivo: Database["public"]["Enums"]["estado_alquiler"] | null
          fecha_alquiler: string | null
          fecha_devolucion: string | null
          fecha_devolucion_real: string | null
          id: string | null
          monto_pagado: number | null
          monto_total: number | null
          observaciones: string | null
          reserva_id: string | null
          resumen_items: string | null
          saldo_pendiente: number | null
          sena: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_clientes: {
        Row: {
          activo: boolean | null
          alquileres_activos: number | null
          alquileres_vencidos: number | null
          apellido: string | null
          created_at: string | null
          direccion: string | null
          dni: string | null
          email: string | null
          id: string | null
          nombre: string | null
          nombre_completo: string | null
          notas: string | null
          saldo_pendiente_total: number | null
          telefono: string | null
          total_alquileres: number | null
          ultimo_alquiler: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_devoluciones: {
        Row: {
          alquiler_id: string | null
          cliente_dni: string | null
          cliente_id: string | null
          cliente_nombre_completo: string | null
          costo_reparacion: number | null
          costo_reposicion: number | null
          created_at: string | null
          created_by: string | null
          dias_atraso: number | null
          estado_disfraz: Database["public"]["Enums"]["estado_devolucion"] | null
          fecha_alquiler: string | null
          fecha_devolucion_pactada: string | null
          fecha_devolucion_real: string | null
          id: string | null
          observaciones: string | null
          unidades_danadas: number | null
          unidades_faltantes: number | null
        }
        Relationships: []
      }
      v_disfraces: {
        Row: {
          activo: boolean | null
          cantidad_alquilada: number | null
          cantidad_disponible: number | null
          cantidad_extraviada: number | null
          cantidad_mantenimiento: number | null
          cantidad_reservada_hoy: number | null
          cantidad_total: number | null
          categoria: Database["public"]["Enums"]["categoria_disfraz"] | null
          codigo: string | null
          deleted_at: string | null
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_disfraz"] | null
          estado_efectivo: Database["public"]["Enums"]["estado_disfraz"] | null
          fecha_creacion: string | null
          id: string | null
          imagen_url: string | null
          nombre: string | null
          precio_alquiler: number | null
          precio_reposicion: number | null
          stock_bajo: boolean | null
          stock_minimo: number | null
          talle: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_movimientos_stock: {
        Row: {
          alquiler_id: string | null
          cantidad: number | null
          created_at: string | null
          devolucion_id: string | null
          disfraz_codigo: string | null
          disfraz_id: string | null
          disfraz_nombre: string | null
          disfraz_talle: string | null
          id: string | null
          motivo: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"] | null
          usuario_id: string | null
          usuario_nombre: string | null
        }
        Relationships: []
      }
      v_reservas: {
        Row: {
          alquiler_id: string | null
          cantidad_items: number | null
          cliente_apellido: string | null
          cliente_dni: string | null
          cliente_id: string | null
          cliente_nombre: string | null
          cliente_nombre_completo: string | null
          cliente_telefono: string | null
          created_at: string | null
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_reserva"] | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string | null
          observaciones: string | null
          resumen_items: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      actualizar_estado_reserva: {
        Args: {
          p_reserva_id: string
          p_estado: Database["public"]["Enums"]["estado_reserva"]
        }
        Returns: undefined
      }
      ajustar_stock: {
        Args: {
          p_disfraz_id: string
          p_tipo: Database["public"]["Enums"]["tipo_movimiento"]
          p_cantidad: number
          p_motivo?: string
          p_origen?: string
        }
        Returns: undefined
      }
      cancelar_alquiler: {
        Args: {
          p_alquiler_id: string
          p_motivo?: string
        }
        Returns: undefined
      }
      crear_alquiler: {
        Args: {
          p_cliente_id: string
          p_fecha_devolucion: string
          p_items: Json
          p_sena?: number
          p_metodo_pago?: Database["public"]["Enums"]["metodo_pago"]
          p_observaciones?: string
          p_fecha_alquiler?: string
          p_reserva_id?: string
        }
        Returns: string
      }
      crear_reserva: {
        Args: {
          p_cliente_id: string
          p_fecha_inicio: string
          p_fecha_fin: string
          p_items: Json
          p_estado?: Database["public"]["Enums"]["estado_reserva"]
          p_observaciones?: string
        }
        Returns: string
      }
      dashboard_resumen: {
        Args: never
        Returns: Json
      }
      disponibilidad_disfraz: {
        Args: {
          p_disfraz_id: string
          p_inicio: string
          p_fin: string
          p_excluir_reserva_id?: string
        }
        Returns: number
      }
      disponibilidad_rango: {
        Args: {
          p_inicio: string
          p_fin: string
          p_excluir_reserva_id?: string
          p_disfraz_ids?: string[]
        }
        Returns: {
          disfraz_id: string
          disponible: number
        }[]
      }
      eliminar_disfraz: {
        Args: {
          p_disfraz_id: string
        }
        Returns: undefined
      }
      hoy: {
        Args: never
        Returns: string
      }
      is_admin: {
        Args: never
        Returns: boolean
      }
      is_staff: {
        Args: never
        Returns: boolean
      }
      registrar_devolucion: {
        Args: {
          p_alquiler_id: string
          p_items: Json
          p_fecha_devolucion_real?: string
          p_costo_reparacion?: number
          p_costo_reposicion?: number
          p_observaciones?: string
          p_monto_cobrado?: number
          p_metodo_pago?: Database["public"]["Enums"]["metodo_pago"]
        }
        Returns: string
      }
      registrar_pago: {
        Args: {
          p_alquiler_id: string
          p_monto: number
          p_metodo?: Database["public"]["Enums"]["metodo_pago"]
          p_tipo?: Database["public"]["Enums"]["tipo_pago"]
          p_fecha?: string
          p_observaciones?: string
        }
        Returns: string
      }
      reporte_clientes_frecuentes: {
        Args: {
          p_desde: string
          p_hasta: string
          p_limite?: number
        }
        Returns: {
          cliente_id: string
          nombre_completo: string
          dni: string
          telefono: string
          cantidad_alquileres: number
          total_facturado: number
          total_pagado: number
          ultimo_alquiler: string
        }[]
      }
      reporte_ingresos: {
        Args: {
          p_desde: string
          p_hasta: string
          p_agrupacion?: string
        }
        Returns: {
          periodo: string
          total: number
          senas: number
          saldos: number
          cargos: number
          cantidad_pagos: number
        }[]
      }
      reporte_mas_alquilados: {
        Args: {
          p_desde: string
          p_hasta: string
          p_limite?: number
        }
        Returns: {
          disfraz_id: string
          codigo: string
          nombre: string
          categoria: Database["public"]["Enums"]["categoria_disfraz"]
          talle: string
          veces_alquilado: number
          unidades_alquiladas: number
          ingresos: number
        }[]
      }
      rol_actual: {
        Args: never
        Returns: Database["public"]["Enums"]["app_rol"]
      }
    }
    Enums: {
      app_rol:
        | "admin"
        | "empleado"
      categoria_disfraz:
        | "superheroes"
        | "princesas"
        | "terror"
        | "animales"
        | "historicos"
        | "profesiones"
        | "infantiles"
        | "adultos"
        | "otros"
      estado_alquiler:
        | "activo"
        | "devuelto"
        | "atrasado"
        | "cancelado"
      estado_devolucion:
        | "bueno"
        | "con_danos"
        | "con_faltantes"
        | "con_danos_y_faltantes"
      estado_disfraz:
        | "disponible"
        | "alquilado"
        | "reservado"
        | "mantenimiento"
        | "extraviado"
      estado_reserva:
        | "pendiente"
        | "confirmada"
        | "cancelada"
        | "convertida"
      metodo_pago:
        | "efectivo"
        | "transferencia"
        | "tarjeta"
        | "otro"
      tipo_movimiento:
        | "alta"
        | "baja"
        | "alquiler"
        | "devolucion"
        | "a_mantenimiento"
        | "reparado"
        | "extraviado"
        | "recuperado"
        | "cancelacion_alquiler"
        | "ajuste"
      tipo_pago:
        | "sena"
        | "saldo"
        | "cargo_extra"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_rol: ["admin", "empleado"],
      categoria_disfraz: ["superheroes", "princesas", "terror", "animales", "historicos", "profesiones", "infantiles", "adultos", "otros"],
      estado_alquiler: ["activo", "devuelto", "atrasado", "cancelado"],
      estado_devolucion: ["bueno", "con_danos", "con_faltantes", "con_danos_y_faltantes"],
      estado_disfraz: ["disponible", "alquilado", "reservado", "mantenimiento", "extraviado"],
      estado_reserva: ["pendiente", "confirmada", "cancelada", "convertida"],
      metodo_pago: ["efectivo", "transferencia", "tarjeta", "otro"],
      tipo_movimiento: ["alta", "baja", "alquiler", "devolucion", "a_mantenimiento", "reparado", "extraviado", "recuperado", "cancelacion_alquiler", "ajuste"],
      tipo_pago: ["sena", "saldo", "cargo_extra"],
    },
  },
} as const
