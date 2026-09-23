import type { ThemeConfig } from 'antd';

/// Los mismos tokens de docs/sistema-de-diseno.md, traducidos al tema de
/// Ant Design. El panel usa componentes de libreria, pero sigue siendo
/// MiTeocal y no un panel generico.
///
/// TODO multi-municipio: estos cuatro colores deberian salir del campo
/// `tema` del documento del municipio, igual que en la app. Ver la regla 3
/// de docs/arquitectura-multimunicipio.md.
export const temaMiTeocal: ThemeConfig = {
  token: {
    colorPrimary: '#1552E0',
    colorSuccess: '#12A150',
    colorError: '#D93A3A',
    colorText: '#0E1116',
    colorTextSecondary: '#6B7280',
    colorBorder: '#E8EAEE',
    colorBorderSecondary: '#E8EAEE',
    colorBgLayout: '#F5F6F8',
    colorBgContainer: '#FFFFFF',

    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,

    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 15,
    lineHeight: 22 / 15,

    controlHeight: 40,
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      headerHeight: 56,
      bodyBg: '#F5F6F8',
    },
    Menu: {
      itemSelectedBg: '#EDF2FE',
      itemSelectedColor: '#1552E0',
    },
    Card: {
      paddingLG: 20,
    },
    Table: {
      headerBg: '#F5F6F8',
      rowHoverBg: '#EDF2FE',
    },
  },
};
