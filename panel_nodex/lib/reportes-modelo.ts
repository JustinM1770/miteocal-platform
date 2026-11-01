import type { Timestamp } from "firebase/firestore";

export type TipoReporte = "bache" | "fuga" | "drenaje" | "basura" | "luminaria" | "otro";
export type UrgenciaReporte = "baja" | "media" | "alta";

export const TIPOS_REPORTE: TipoReporte[] = ["bache", "fuga", "drenaje", "basura", "luminaria", "otro"];
export const ETIQUETA_REPORTE: Record<TipoReporte, string> = {
  bache: "Bache",
  fuga: "Fuga de agua",
  drenaje: "Drenaje",
  basura: "Basura",
  luminaria: "Luminaria",
  otro: "Otro",
};
export const AREAS_RESPONSABLES = ["Agua/SAPAS", "Obras Públicas", "Servicios Públicos", "Ecología", "Por determinar"] as const;
export type AreaResponsableReporte = (typeof AREAS_RESPONSABLES)[number];

export interface ClasificacionIASugerida {
  tipo: TipoReporte;
  urgencia: UrgenciaReporte;
  area: AreaResponsableReporte;
  confianza: number;
  modelo: string;
  clasificadaEn: Timestamp | Date;
}

export interface ClasificacionFinalReporte {
  tipo: TipoReporte;
  urgencia: UrgenciaReporte;
  area: AreaResponsableReporte;
  origen: "ia" | "funcionario";
  actualizadoEn: Timestamp | Date;
}
