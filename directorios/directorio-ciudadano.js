const entidades=[
{nombre:"Ministerio de Educación - MINEDU",sigla:"MIN",categoria:"Educación",ambito:"Nacional",servicio:"Rector de la política educativa nacional. Brinda información sobre normas, servicios, programas y trámites del sector educación.",direccion:"Calle Del Comercio N° 193, San Borja, Lima",telefono:"(01) 615-5800",correo:"Canales oficiales en gob.pe",horario:"Lunes a viernes, 8:30 a. m. a 5:00 p. m.",web:"https://www.gob.pe/minedu",observacion:"Entidad base para normativa educativa, servicios digitales y orientación general del sector."},
{nombre:"Centro Nacional de Recursos de Educación Básica Especial - CENAREBE",sigla:"CNR",categoria:"Educación",ambito:"Nacional",servicio:"Recurso nacional vinculado a Educación Básica Especial y materiales de apoyo para la atención educativa de estudiantes con discapacidad.",direccion:"Calle Coronel Manuel Gómez N° 435, Jesús María, Lima",telefono:"Canal MINEDU",correo:"Canal MINEDU",horario:"Verificar en MINEDU",web:"https://www.gob.pe/minedu",observacion:"Puede presentarse dentro de la red de recursos de Educación Básica Especial."},
{nombre:"Fondo Nacional de Desarrollo de la Educación Peruana - FONDEP",sigla:"FON",categoria:"Educación",ambito:"Nacional",servicio:"Promueve innovación educativa, buenas prácticas, proyectos de mejora y experiencias pedagógicas.",direccion:"Calle Compostela N° 142, Urb. La Calesa, Santiago de Surco, Lima",telefono:"615-5800 anexo 66841",correo:"fondep@fondep.gob.pe",horario:"Verificar en página oficial",web:"https://www.gob.pe/fondep",observacion:"Útil para docentes e instituciones interesadas en innovación educativa."},
{nombre:"PRONABEC",sigla:"BEC",categoria:"Educación",ambito:"Nacional",servicio:"Becas, crédito educativo, orientación para postulación y seguimiento de oportunidades académicas.",direccion:"Av. Paseo de la República N° 3755, San Isidro, Lima",telefono:"(01) 612-8230 / 0800-00018 / WhatsApp +51 914 121 106",correo:"Canales oficiales en página web",horario:"Lunes a viernes, 8:30 a. m. a 5:30 p. m.",web:"https://www.gob.pe/pronabec",observacion:"Recurso importante para estudiantes y familias que buscan becas del Estado."},
{nombre:"PRONIED",sigla:"PRN",categoria:"Educación",ambito:"Nacional",servicio:"Infraestructura educativa, mantenimiento, obras y servicios vinculados a locales escolares.",direccion:"Jr. Carabaya N° 341, Cercado de Lima",telefono:"(511) 680-6777 / (511) 427-3137 / 0800-11-100",correo:"orientacion@pronied.gob.pe",horario:"Mesa de partes: 8:30 a. m. a 5:00 p. m.",web:"https://www.gob.pe/pronied",observacion:"Relevante para consultas sobre infraestructura y condiciones físicas de instituciones educativas."},
{nombre:"PerúEduca y mesa de ayuda MINEDU",sigla:"PED",categoria:"Educación",ambito:"Nacional",servicio:"Soporte para plataformas educativas, comunidad docente, Cierre de Brecha Digital y servicios digitales del MINEDU.",direccion:"Atención virtual",telefono:"01 6155802 / 01 6155890 / WhatsApp 983 099 001",correo:"serviciodeayuda@minedu.gob.pe",horario:"Verificar según canal",web:"https://www.perueduca.pe/",observacion:"Útil para docentes que usan servicios digitales del sector educación."},
{nombre:"SUNEDU",sigla:"SUN",categoria:"Educación",ambito:"Nacional",servicio:"Información sobre universidades, grados, títulos, licenciamiento y servicios universitarios.",direccion:"Calle Aldabas N° 337, Urb. Las Gardenias, Santiago de Surco, Lima",telefono:"(01) 500-3930",correo:"consultas@sunedu.gob.pe",horario:"Lunes a viernes, 8:30 a. m. a 4:30 p. m.",web:"https://www.gob.pe/sunedu",observacion:"Recurso de consulta para educación superior universitaria."},
{nombre:"Dirección Regional de Educación de Ucayali - DREU",sigla:"DRE",categoria:"Educación",ambito:"Regional Ucayali",servicio:"Gestión educativa regional, coordinación con UGEL, servicios administrativos y orientación del sector educación en Ucayali.",direccion:"Av. Centenario Km 3.800 / Av. Sáenz Peña N° 220, Pucallpa",telefono:"061-571433 / Telefax 57-2236",correo:"Canales oficiales en DREU",horario:"Lunes a viernes",web:"https://dreucayali.gob.pe/",observacion:"Entidad regional clave para derivaciones y coordinación educativa."},
{nombre:"UGEL Coronel Portillo",sigla:"UCP",categoria:"Educación",ambito:"Local",servicio:"Gestión educativa local de instituciones educativas de Coronel Portillo.",direccion:"Las Mercedes, Pucallpa 25001, Manantay",telefono:"Verificar en canal oficial",correo:"ugelcoronelportillo@ugelcp.gob.pe",horario:"Lunes a viernes",web:"https://www.gob.pe/ugelcoronelportillo",observacion:"Recurso local para instituciones educativas, docentes y familias."},
{nombre:"UGEL Atalaya",sigla:"UGA",categoria:"Educación",ambito:"Local",servicio:"Gestión educativa local de la provincia de Atalaya.",direccion:"Calle Urubamba lote S/N, Raymondi, Atalaya",telefono:"Verificar en canal oficial",correo:"Canales oficiales en gob.pe",horario:"Lunes a viernes",web:"https://www.gob.pe/ugelatalaya",observacion:"Útil para consultas y trámites educativos de Atalaya."},
{nombre:"UGEL Padre Abad",sigla:"UPA",categoria:"Educación",ambito:"Local",servicio:"Gestión educativa local de la provincia de Padre Abad.",direccion:"Padre Abad, Ucayali",telefono:"961023193 / 990874617",correo:"direccion@ugelpadreabad.gob.pe / soporte@ugelpadreabad.gob.pe",horario:"Verificar en canal oficial",web:"https://ugelpadreabad.gob.pe/",observacion:"Los teléfonos deben confirmarse antes de publicar como contacto definitivo."},
{nombre:"UGEL Purús",sigla:"UGP",categoria:"Educación",ambito:"Local",servicio:"Gestión educativa local de la provincia de Purús.",direccion:"Av. Purús S/N, Puerto Esperanza, Purús",telefono:"Verificar en canal oficial",correo:"mesadepartesvirtual@ugelpurus.net",horario:"Lunes a viernes",web:"https://www.gob.pe/ugelpurus",observacion:"Recurso de consulta para trámites educativos en Purús."},
{nombre:"CONADIS",sigla:"CON",categoria:"Discapacidad e inclusión",ambito:"Nacional",servicio:"Derechos, registro, fiscalización y orientación vinculada a personas con discapacidad.",direccion:"Av. Arequipa 375, Lima",telefono:"(01) 6305170 / 0800 00151",correo:"Canales oficiales en gob.pe",horario:"Lunes a viernes",web:"https://www.gob.pe/conadis",observacion:"Entidad principal para orientación sobre discapacidad y registro nacional."},
{nombre:"CONADIS Ucayali",sigla:"COU",categoria:"Discapacidad e inclusión",ambito:"Regional Ucayali",servicio:"Atención regional sobre discapacidad, orientación y coordinación con servicios públicos.",direccion:"Jr. Raymondi N° 101, Callería, Coronel Portillo",telefono:"970 089 771 / 939 264 752",correo:"Canales oficiales",horario:"Lunes a viernes",web:"https://www.gob.pe/conadis",observacion:"Contacto regional útil para familias, instituciones y usuarios de Ucayali."},
{nombre:"Observatorio CONADIS",sigla:"OBS",categoria:"Discapacidad e inclusión",ambito:"Nacional",servicio:"Información estadística, reportes y recursos sobre discapacidad en el Perú.",direccion:"Atención virtual",telefono:"Canales CONADIS",correo:"Canales CONADIS",horario:"Disponible en línea",web:"https://observatorio.conadisperu.gob.pe/",observacion:"Fuente de consulta para diagnósticos, reportes y referencias."},
{nombre:"OMAPED Coronel Portillo",sigla:"OMA",categoria:"Discapacidad e inclusión",ambito:"Municipal",servicio:"Oficina municipal de atención a personas con discapacidad.",direccion:"Municipalidad Provincial de Coronel Portillo, Callería",telefono:"Verificar en municipalidad",correo:"Canal municipal",horario:"Verificar en municipalidad",web:"https://www.gob.pe/municoronelportillo",observacion:"Confirmar teléfono y oficina vigente antes de acudir."},
{nombre:"Programa Contigo",sigla:"CTG",categoria:"Discapacidad e inclusión",ambito:"Nacional",servicio:"Pensión no contributiva para personas con discapacidad severa en situación de pobreza.",direccion:"Av. Paseo de la República 3245, San Isidro, Lima",telefono:"(01) 644 9006 opción 1",correo:"consultas@contigo.gob.pe",horario:"Verificar en página oficial",web:"https://contigo.gob.pe/",observacion:"Importante para orientar sobre requisitos y afiliación."},
{nombre:"Ministerio de Salud - MINSA",sigla:"MIN",categoria:"Salud",ambito:"Nacional",servicio:"Rector de la política nacional de salud, campañas y servicios nacionales.",direccion:"Av. Salaverry 801, Jesús María, Lima",telefono:"(01) 315 6600 / Línea 113",correo:"Canales oficiales en gob.pe",horario:"Lunes a viernes",web:"https://www.gob.pe/minsa",observacion:"La Línea 113 brinda orientación gratuita en salud."},
{nombre:"DIRESA Ucayali",sigla:"DIU",categoria:"Salud",ambito:"Regional Ucayali",servicio:"Autoridad regional de salud y coordinación de establecimientos en Ucayali.",direccion:"Jr. Carmen Cabrejos N° 547-549, Callería",telefono:"+51 61 787927",correo:"tramite@diresau.gob.pe",horario:"Lunes a viernes",web:"https://www.diresaucayali.gob.pe/",observacion:"Entidad regional de referencia para salud pública en Ucayali."},
{nombre:"Red de Salud de Coronel Portillo",sigla:"RCP",categoria:"Salud",ambito:"Provincial",servicio:"Gestión de establecimientos y servicios de salud en Coronel Portillo.",direccion:"Jr. Los Tulipanes Mz. 1 Lote 5, Manantay",telefono:"Verificar en canal oficial",correo:"documentacion@riscoronelportillo.gob.pe",horario:"Lunes a viernes",web:"https://www.gob.pe/regionucayali-riscoronelportillo",observacion:"Útil para ubicar servicios de salud cercanos."},
{nombre:"Hospital Regional de Pucallpa",sigla:"HRP",categoria:"Salud",ambito:"Regional Ucayali",servicio:"Atención hospitalaria regional, emergencia y servicios especializados.",direccion:"Jr. Agustín Cauper 285, Callería",telefono:"Verificar en canal oficial",correo:"hospitalregional@hrpucallpa.gob.pe",horario:"Emergencia y hospitalización: todos los días",web:"https://www.gob.pe/hrp",observacion:"Referencia hospitalaria regional."},
{nombre:"Seguro Integral de Salud - SIS",sigla:"SIS",categoria:"Salud",ambito:"Nacional",servicio:"Afiliación, orientación y cobertura para asegurados al SIS.",direccion:"Av. Paseo de la República N° 1645, La Victoria, Lima",telefono:"113 opción 4 / (01) 514 5555",correo:"sis@sis.gob.pe",horario:"Lunes a viernes",web:"https://www.gob.pe/sis",observacion:"Recurso útil para consultar afiliación y cobertura."},
{nombre:"EsSalud",sigla:"ESS",categoria:"Salud",ambito:"Nacional",servicio:"Seguro social de salud para asegurados, citas y orientación.",direccion:"Sedes a nivel nacional",telefono:"Línea 107",correo:"Canales oficiales en gob.pe",horario:"Línea 107: 24 horas",web:"https://www.gob.pe/essalud",observacion:"Orientación para asegurados."},
{nombre:"Ministerio de la Mujer y Poblaciones Vulnerables - MIMP",sigla:"MMP",categoria:"Protección y familia",ambito:"Nacional",servicio:"Servicios para mujer, familia, niñez, adolescencia y poblaciones vulnerables.",direccion:"Jr. Camaná 616, Lima",telefono:"(01) 626-1600",correo:"Canales oficiales en gob.pe",horario:"Verificar en página oficial",web:"https://www.gob.pe/mimp",observacion:"Entidad base para servicios de protección."},
{nombre:"Línea 100",sigla:"100",categoria:"Protección y familia",ambito:"Nacional",servicio:"Orientación y consejería frente a casos de violencia familiar.",direccion:"Atención telefónica",telefono:"100",correo:"Canales MIMP",horario:"Atención permanente",web:"https://www.gob.pe/linea100",observacion:"En emergencia inmediata, comunicarse también con servicios de emergencia."},
{nombre:"INABIF",sigla:"INA",categoria:"Protección y familia",ambito:"Nacional",servicio:"Atención a familias, niñas, niños, adolescentes y personas en situación de vulnerabilidad.",direccion:"Av. San Martín 685, Pueblo Libre, Lima",telefono:"Verificar en canal oficial",correo:"Canales oficiales",horario:"Lunes a viernes",web:"https://www.gob.pe/inabif",observacion:"Servicio especializado de protección y atención social."},
{nombre:"Unidad de Protección Especial - UPE Ucayali",sigla:"UPE",categoria:"Protección y familia",ambito:"Regional Ucayali",servicio:"Protección especializada para niñas, niños y adolescentes.",direccion:"Jr. Oscar Zevallos N° 173, Callería",telefono:"902728078",correo:"fgonzalez@mimp.gob.pe",horario:"Lunes a viernes",web:"https://www.gob.pe/mimp",observacion:"Servicio regional de protección especializada."},
{nombre:"DEMUNA Coronel Portillo",sigla:"DEM",categoria:"Protección y familia",ambito:"Municipal",servicio:"Defensa municipal de niñas, niños y adolescentes.",direccion:"Jr. Tacna 288, Callería",telefono:"Verificar en municipalidad",correo:"demuna@municportillo.gob.pe",horario:"Lunes a viernes",web:"https://www.gob.pe/municoronelportillo",observacion:"Servicio municipal de orientación y defensa de derechos."},
{nombre:"DEMUNA Yarinacocha",sigla:"DMY",categoria:"Protección y familia",ambito:"Municipal",servicio:"Defensoría Municipal del Niño y del Adolescente del distrito.",direccion:"Municipalidad Distrital de Yarinacocha",telefono:"Verificar en municipalidad",correo:"Canales oficiales",horario:"Verificar en página oficial",web:"https://www.gob.pe/muniyarinacocha",observacion:"Verificar atención vigente."},
{nombre:"Gobierno Regional de Ucayali",sigla:"GRU",categoria:"Gobierno y trámites",ambito:"Regional Ucayali",servicio:"Gestión regional, programas, servicios y direcciones regionales.",direccion:"Jr. Raymondi N° 220, Callería",telefono:"Verificar en canal oficial",correo:"Canales oficiales",horario:"Lunes a viernes",web:"https://www.gob.pe/regionucayali",observacion:"Puerta de entrada a direcciones regionales."},
{nombre:"Municipalidad Provincial de Coronel Portillo",sigla:"MPC",categoria:"Gobierno y trámites",ambito:"Municipal",servicio:"Trámites municipales, servicios locales, DEMUNA y seguridad ciudadana.",direccion:"Jr. Tacna N° 480, Callería",telefono:"061 571118 / 061 591412",correo:"webmaster@municportillo.gob.pe",horario:"Lunes a viernes",web:"https://www.gob.pe/municoronelportillo",observacion:"Entidad municipal principal para trámites locales."},
{nombre:"Municipalidad Distrital de Yarinacocha",sigla:"MDY",categoria:"Gobierno y trámites",ambito:"Municipal",servicio:"Gobierno local del distrito de Yarinacocha.",direccion:"Jr. 2 de Mayo N° 277, Yarinacocha",telefono:"Serenazgo 984709855",correo:"Canales oficiales",horario:"Verificar",web:"https://www.gob.pe/muniyarinacocha",observacion:"Entidad municipal distrital."},
{nombre:"Municipalidad Distrital de Campo Verde",sigla:"MCV",categoria:"Gobierno y trámites",ambito:"Municipal",servicio:"Gobierno local del distrito de Campo Verde.",direccion:"Calle Municipal N° 139, Campo Verde",telefono:"976068800 / 932667837",correo:"Canales oficiales",horario:"Verificar",web:"https://www.gob.pe/municampoverde",observacion:"Entidad municipal distrital."},
{nombre:"Municipalidad Distrital de Masisea",sigla:"MDM",categoria:"Gobierno y trámites",ambito:"Municipal",servicio:"Gobierno local del distrito de Masisea.",direccion:"Av. Inca Garcilazo de la Vega S/N, Masisea",telefono:"Serenazgo 959251285",correo:"Canales oficiales",horario:"Verificar",web:"https://www.gob.pe/munimasisea",observacion:"Entidad municipal distrital."},
{nombre:"Municipalidad Provincial de Atalaya",sigla:"MPA",categoria:"Gobierno y trámites",ambito:"Municipal",servicio:"Gobierno local de la provincia de Atalaya.",direccion:"Calle Rioja N° 659, Raymondi, Atalaya",telefono:"981945405",correo:"Canales oficiales",horario:"Verificar",web:"https://www.gob.pe/muniatalaya",observacion:"Entidad municipal provincial."},
{nombre:"RENIEC Pucallpa",sigla:"DNI",categoria:"Gobierno y trámites",ambito:"Local",servicio:"DNI, identificación y trámites registrales.",direccion:"Jr. 9 de Diciembre N° 378, Pucallpa",telefono:"01-3154000",correo:"consultasregionpucallpa@reniec.gob.pe",horario:"Verificar en buscador oficial",web:"https://www.gob.pe/reniec",observacion:"Verificar sede y horario antes de acudir."},
{nombre:"Banco de la Nación",sigla:"BN",categoria:"Gobierno y trámites",ambito:"Nacional",servicio:"Pagos, tasas y servicios bancarios públicos.",direccion:"Sede administrativa: Lima",telefono:"(01) 519 2000 / 0 800 10 700",correo:"Canales oficiales",horario:"Verificar por agencia",web:"https://www.gob.pe/bn",observacion:"Consultar agencias locales."},
{nombre:"Defensoría del Pueblo - Ucayali",sigla:"DEF",categoria:"Justicia y trabajo",ambito:"Regional Ucayali",servicio:"Quejas, consultas y defensa de derechos ciudadanos ante entidades públicas.",direccion:"Callería, Coronel Portillo",telefono:"(061) 578633 / 961 659 821",correo:"oducayali@defensoria.gob.pe",horario:"Lunes a viernes",web:"https://www.defensoria.gob.pe/",observacion:"Confirmar dirección vigente antes de acudir."},
{nombre:"Ministerio de Justicia y Derechos Humanos - MINJUSDH",sigla:"JUS",categoria:"Justicia y trabajo",ambito:"Nacional",servicio:"Justicia, derechos humanos, defensa pública y orientación legal.",direccion:"Calle Scipión Llona N° 350, Miraflores",telefono:"(01) 204-8020",correo:"atencionalciudadano@minjus.gob.pe",horario:"Verificar",web:"https://www.gob.pe/minjus",observacion:"Recurso de orientación legal."},
{nombre:"Ministerio de Trabajo y Promoción del Empleo - MTPE",sigla:"MTP",categoria:"Justicia y trabajo",ambito:"Nacional",servicio:"Trabajo, empleo, derechos laborales y promoción del empleo.",direccion:"Av. Gral. Salaverry 655, Jesús María",telefono:"(01) 630-6000",correo:"centrodeempleolm@trabajo.gob.pe",horario:"Lunes a viernes",web:"https://www.gob.pe/mtpe",observacion:"Orientación laboral."},
{nombre:"SUNAFIL",sigla:"SFL",categoria:"Justicia y trabajo",ambito:"Nacional",servicio:"Fiscalización laboral y denuncias sociolaborales.",direccion:"Av. Gral. Salaverry 655, Jesús María",telefono:"(01) 390 2800",correo:"Canales oficiales",horario:"Lunes a viernes",web:"https://www.gob.pe/sunafil",observacion:"Cuenta con intendencias regionales."},
{nombre:"Policía Nacional del Perú",sigla:"105",categoria:"Emergencias",ambito:"Nacional",servicio:"Atención de emergencia policial.",direccion:"Comisarías a nivel nacional",telefono:"105",correo:"Canales oficiales",horario:"24 horas",web:"https://www.gob.pe/pnp",observacion:"Usar ante emergencia policial."},
{nombre:"Bomberos",sigla:"116",categoria:"Emergencias",ambito:"Nacional",servicio:"Incendios, rescate y emergencias.",direccion:"Compañías a nivel nacional",telefono:"116",correo:"Canales oficiales",horario:"24 horas",web:"https://www.gob.pe/bomberos",observacion:"Usar ante incendios o rescate."},
{nombre:"SAMU",sigla:"106",categoria:"Emergencias",ambito:"Nacional",servicio:"Emergencia médica y atención prehospitalaria.",direccion:"Atención telefónica",telefono:"106",correo:"Canales MINSA",horario:"24 horas",web:"https://www.gob.pe/minsa",observacion:"Verificar servicio regional vigente."},
{nombre:"Defensa Civil",sigla:"115",categoria:"Emergencias",ambito:"Nacional",servicio:"Gestión del riesgo y atención ante desastres.",direccion:"Atención telefónica",telefono:"115",correo:"Canales oficiales",horario:"24 horas",web:"https://www.gob.pe/indeci",observacion:"Número de referencia ante desastres."},
{nombre:"Línea 113 Salud",sigla:"113",categoria:"Emergencias",ambito:"Nacional",servicio:"Información y orientación gratuita en salud.",direccion:"Atención telefónica",telefono:"113",correo:"Canales MINSA",horario:"Verificar según opción",web:"https://www.gob.pe/minsa",observacion:"No reemplaza atención de emergencia inmediata."},
{nombre:"MIDIS - Línea social gratuita",sigla:"101",categoria:"Emergencias",ambito:"Nacional",servicio:"Orientación sobre programas sociales y servicios del MIDIS.",direccion:"Atención telefónica",telefono:"101",correo:"Canales MIDIS",horario:"Verificar",web:"https://www.gob.pe/midis",observacion:"Consultas sobre programas sociales."},
{nombre:"Ministerio de Desarrollo e Inclusión Social - MIDIS",sigla:"MID",categoria:"Ayuda social",ambito:"Nacional",servicio:"Programas sociales, SISFOH y servicios de inclusión social.",direccion:"Sede central y módulos de orientación",telefono:"Línea social gratuita 101",correo:"Canales oficiales",horario:"Verificar",web:"https://www.gob.pe/midis",observacion:"Orientación sobre clasificación socioeconómica y programas sociales."},
{nombre:"Programa Nacional Cuna Más",sigla:"CNM",categoria:"Ayuda social",ambito:"Nacional",servicio:"Atención integral a niñas y niños menores de 36 meses.",direccion:"Sedes y unidades territoriales",telefono:"Canales oficiales",correo:"Canales oficiales",horario:"Verificar",web:"https://www.gob.pe/cunamas",observacion:"Recurso para primera infancia y acompañamiento familiar."},
{nombre:"Programa Nacional de Asistencia Solidaria Pensión 65",sigla:"P65",categoria:"Ayuda social",ambito:"Nacional",servicio:"Pensión no contributiva para personas adultas mayores vulnerables.",direccion:"Unidades territoriales",telefono:"Canales oficiales",correo:"Canales oficiales",horario:"Verificar",web:"https://www.gob.pe/pension65",observacion:"Orientación sobre acceso al programa."},
{nombre:"Programa Nacional Warmi Ñan",sigla:"WRM",categoria:"Protección y familia",ambito:"Nacional",servicio:"Prevención y atención frente a la violencia familiar.",direccion:"Servicios y sedes",telefono:"Línea 100",correo:"Canales oficiales",horario:"Verificar",web:"https://www.gob.pe/warminan",observacion:"Complementa la Línea 100."},
{nombre:"SUNARP",sigla:"SRP",categoria:"Gobierno y trámites",ambito:"Nacional",servicio:"Registros públicos, propiedad, vehículos y partidas registrales.",direccion:"Oficinas registrales",telefono:"Canales oficiales",correo:"Canales oficiales",horario:"Verificar",web:"https://www.gob.pe/sunarp",observacion:"Trámites registrales."},
{nombre:"SUNAT",sigla:"SAT",categoria:"Gobierno y trámites",ambito:"Nacional",servicio:"Orientación tributaria, RUC, clave SOL y comprobantes.",direccion:"Centros de servicios",telefono:"Canales oficiales",correo:"Canales oficiales",horario:"Verificar",web:"https://www.gob.pe/sunat",observacion:"Trámites tributarios."},
{nombre:"Migraciones",sigla:"MIG",categoria:"Gobierno y trámites",ambito:"Nacional",servicio:"Trámites migratorios, pasaporte y atención a personas extranjeras.",direccion:"Jefaturas zonales y agencias",telefono:"Canales oficiales",correo:"Canales oficiales",horario:"Verificar",web:"https://www.gob.pe/migraciones",observacion:"Trámites migratorios y documentos de viaje."},
{nombre:"Ministerio de Cultura",sigla:"CUL",categoria:"Cultura e interculturalidad",ambito:"Nacional",servicio:"Cultura, patrimonio, pueblos indígenas y enfoque intercultural.",direccion:"Sede central y direcciones desconcentradas",telefono:"Canales oficiales",correo:"Canales oficiales",horario:"Verificar",web:"https://www.gob.pe/cultura",observacion:"Orientación sobre interculturalidad y derechos culturales."}
];
const categorias=[
  "Educación",
  "Discapacidad e inclusión",
  "Salud",
  "Protección y familia",
  "Gobierno y trámites",
  "Justicia y trabajo",
  "Emergencias",
  "Ayuda social",
  "Cultura e interculturalidad"
];

const buscador=document.getElementById("buscador");
const categoria=document.getElementById("categoria");
const directorio=document.getElementById("directorio");
const resumen=document.getElementById("resumen-resultados");
const sinResultados=document.getElementById("sin-resultados");
const chips=document.getElementById("chips-categorias");
const limpiar=document.getElementById("limpiar");

function norm(texto){
  return String(texto||"")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"");
}

function urlHttpsSegura(valor){
  try{
    const url=new URL(String(valor||"").trim());
    return url.protocol==="https:" ? url.href : null;
  }catch(error){
    return null;
  }
}

function crearCampo(label,valor,tipo){
  if(!valor) return null;

  const item=document.createElement("li");
  const etiqueta=document.createElement("strong");
  const contenido=document.createElement("span");

  etiqueta.textContent=label;

  if(tipo==="web"){
    const url=urlHttpsSegura(valor);
    if(url){
      const enlace=document.createElement("a");
      enlace.href=url;
      enlace.target="_blank";
      enlace.rel="noopener noreferrer";
      enlace.textContent="Página oficial";
      contenido.appendChild(enlace);
    }else{
      contenido.textContent="Enlace no disponible";
    }
  }else{
    contenido.textContent=valor;
  }

  item.append(etiqueta,contenido);
  return item;
}

function crearEtiqueta(texto){
  const etiqueta=document.createElement("span");
  etiqueta.className="etiqueta";
  etiqueta.textContent=texto;
  return etiqueta;
}

function crearTarjeta(entidad){
  const articulo=document.createElement("article");
  articulo.className="tarjeta-entidad";

  const superior=document.createElement("div");
  superior.className="tarjeta-superior";

  const sigla=document.createElement("span");
  sigla.className="sigla";
  sigla.textContent=entidad.sigla;

  const encabezado=document.createElement("div");
  const titulo=document.createElement("h3");
  titulo.textContent=entidad.nombre;

  const meta=document.createElement("div");
  meta.className="meta";
  meta.append(
    crearEtiqueta(entidad.categoria),
    crearEtiqueta(entidad.ambito)
  );

  encabezado.append(titulo,meta);
  superior.append(sigla,encabezado);

  const descripcion=document.createElement("p");
  descripcion.className="descripcion";
  descripcion.textContent=entidad.servicio;

  const datos=document.createElement("ul");
  datos.className="datos";
  [
    crearCampo("Dirección",entidad.direccion),
    crearCampo("Teléfono",entidad.telefono),
    crearCampo("Correo",entidad.correo),
    crearCampo("Horario",entidad.horario),
    crearCampo("Web",entidad.web,"web")
  ].filter(Boolean).forEach((item)=>datos.appendChild(item));

  const observacion=document.createElement("p");
  observacion.className="observacion";
  observacion.textContent=entidad.observacion;

  const acciones=document.createElement("div");
  acciones.className="acciones";

  const webSegura=urlHttpsSegura(entidad.web);
  if(webSegura){
    const fuente=document.createElement("a");
    fuente.className="boton-enlace";
    fuente.href=webSegura;
    fuente.target="_blank";
    fuente.rel="noopener noreferrer";
    fuente.textContent="Abrir fuente oficial";
    acciones.appendChild(fuente);
  }

  const subir=document.createElement("a");
  subir.className="boton-enlace boton-secundario";
  subir.href="#inicio";
  subir.textContent="Subir";
  acciones.appendChild(subir);

  articulo.append(superior,descripcion,datos,observacion,acciones);
  return articulo;
}

function textoEntidad(entidad){
  return norm(Object.values(entidad).join(" "));
}

function pintarChips(lista){
  chips.replaceChildren();

  categorias.forEach((cat)=>{
    const total=lista.filter((entidad)=>entidad.categoria===cat).length;
    if(total<=0) return;

    const chip=document.createElement("span");
    chip.className="chip";

    const contador=document.createElement("span");
    contador.textContent=String(total);

    chip.append(document.createTextNode(`${cat} `),contador);
    chips.appendChild(chip);
  });
}

function cargarCategorias(){
  categoria.replaceChildren();

  const todas=document.createElement("option");
  todas.value="todas";
  todas.textContent="Todas las categorías";
  categoria.appendChild(todas);

  categorias.forEach((cat)=>{
    const opcion=document.createElement("option");
    opcion.value=cat;
    opcion.textContent=cat;
    categoria.appendChild(opcion);
  });
}

function renderizar(){
  const consulta=norm(buscador.value);
  const filtro=categoria.value;

  const lista=entidades.filter((entidad)=>
    (filtro==="todas"||entidad.categoria===filtro) &&
    (!consulta||textoEntidad(entidad).includes(consulta))
  );

  directorio.replaceChildren();
  sinResultados.hidden=lista.length>0;
  resumen.textContent=lista.length===1
    ? "Se encontró 1 entidad."
    : `Se encontraron ${lista.length} entidades.`;

  pintarChips(lista);

  categorias.forEach((cat)=>{
    const items=lista.filter((entidad)=>entidad.categoria===cat);
    if(!items.length) return;

    const seccion=document.createElement("section");
    seccion.className="seccion-grupo";

    const titulo=document.createElement("h2");
    titulo.className="titulo-grupo";
    titulo.textContent=cat;

    const grid=document.createElement("div");
    grid.className="grid-entidades";
    items.forEach((entidad)=>grid.appendChild(crearTarjeta(entidad)));

    seccion.append(titulo,grid);
    directorio.appendChild(seccion);
  });
}

cargarCategorias();
buscador.addEventListener("input",renderizar);
categoria.addEventListener("change",renderizar);
limpiar.addEventListener("click",()=>{
  buscador.value="";
  categoria.value="todas";
  renderizar();
  buscador.focus();
});
renderizar();
