# INFVER

Frontend Next.js y backend Express separados, comunicados exclusivamente por REST.

## Iniciar

Requiere Node 22 o superior. Desde la raíz, en una terminal normal del equipo:

```powershell
npm ci
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
npm run dev
```

Frontend: http://localhost:3000. Backend: http://localhost:4000/api/v1.
El frontend envía las peticiones a `/api/v1` y Next las reenvía al backend mediante una regla de proxy; no contiene lógica financiera ni rutas API propias.
Las variables de ejemplo están en `backend/.env.example` y `frontend/.env.example`.
El directorio de trabajo no debe ser publicado con archivos `.env`.

## Datos actuales

| Información | Fuente | Frecuencia del servidor | Clave |
| --- | --- | --- | --- |
| Noticias | GDELT y RSS oficiales de la Reserva Federal (inglés) y Banco de España (español) | 15 minutos; respeta pausas por límite | No |
| Tasas TNA | Tabla pública BCRA; respaldo ArgentinaDatos | 3 horas | No |
| Tasas TEA | API de Transparencia del BCRA, último respaldo | 3 horas | No |
| BTC, ETH, USDT | CoinLore, precio agregado y variación 24 h reportada | 1 minuto | No |
| Dólares | DolarApi, compra/venta y fecha de referencia | 3 horas | No |
| Acciones y ETF extranjeros | Twelve Data, cierres ajustados | 6 horas | Sí, y permisos de uso y exhibición |
| Agenda económica | Calendario oficial BLS | 6 horas | No |

Cada tarjeta identifica su moneda, fuente y fecha. Las cotizaciones agregadas no son ofertas ejecutables. Las tasas nominales del comparador no se mezclan con TEA, UVA o depósitos en USD.
La normalización de ArgentinaDatos acepta una respuesta homogénea en proporciones o puntos porcentuales; si las unidades resultan ambiguas, se rechaza esa respuesta.

Para mostrar el dato actual **no se construye un dataset**. Precios y dólares mantienen sólo una caché de memoria. Noticias y tasas reemplazan su última descarga; no acumulan históricos. El calendario conserva un archivo limitado de eventos, porque la sección incluye una vista de eventos anteriores.
Una caída requiere una comparación. CoinLore entrega su variación de 24 horas. Las señales de acciones requieren la serie de cierres del proveedor: no se deducen de titulares ni de un único precio.

## Diagnóstico de conexiones

```powershell
npm run diagnose
```

El diagnóstico consulta cada fuente una vez y muestra HTTP, tamaño, demora y errores de conexión, sin mostrar claves.
`ENOTFOUND`/`EAI_AGAIN` indica DNS; `EACCES`/`EPERM`, bloqueo de red del entorno; HTTP 429 o el mensaje de GDELT, límite del proveedor.
Si se ejecuta desde un entorno sin Internet, todas las fuentes pueden fallar aunque el código sea correcto. Ejecutar el backend desde la terminal habitual del equipo permite comprobar su conectividad real; no hay que desactivar TLS ni el firewall para probarlo.

El descargador admite hasta tres redirecciones HTTPS dentro del mismo dominio, respeta el charset declarado y limita las respuestas a 5 MB y ocho segundos por fuente. La interfaz espera hasta 45 segundos para cubrir las fuentes de respaldo del comparador. Consultas simultáneas comparten una descarga; una falla de conexión se reintenta después de una pausa, sin un bucle inmediato.

## Verificación

```powershell
npm run check:encoding
npm run typecheck
npm test
npm run build
```

Las pruebas usan fixtures identificados como pruebas, nunca datos ficticios para producción. Comprueban REST, perfil, asignación exacta de centavos, parsers de fuentes, redirecciones, charset, caché, respaldo de noticias y señales de riesgo.
Webpack se usa explícitamente para evitar el fallo de procesos auxiliares de Turbopack observado en el entorno Windows de desarrollo. En Windows, la exportación usa un trabajador para evitar el error EPERM de creación paralela de directorios.

## Condiciones de las fuentes

- GDELT: https://www.gdeltproject.org/about.html. Se cita el servicio; no se copian fotografías ni notas completas de terceros.
- Reserva Federal: https://www.federalreserve.gov/disclaimer.htm. Comunicados oficiales y sus enlaces, con atribución.
- BCRA: https://www.bcra.gob.ar/regimen-de-transparencia/. Citar fuente, fecha de descarga y selección de entidades.
- ArgentinaDatos: https://argentinadatos.com/docs/uso. Citar ArgentinaDatos y las fuentes originales. La licencia del programa no reemplaza la licencia de las series.
- DolarApi: https://dolarapi.com/docs/uso. Citar el servicio, identificar sus fuentes y respetar su recomendación de frecuencia.
- CoinLore: https://www.coinlore.com/cryptocurrency-data-api. API pública orientada también a aplicaciones y tableros; se identifica el proveedor y se usa una consulta por minuto.
- Twelve Data: https://twelvedata.com/terms. La clave no garantiza derechos de exhibición o redistribución: verificar el plan antes de activar.
- No se copian endpoints internos de Forex Factory ni se integra Yahoo Finance como fuente de redistribución sin autorización.

Los análisis generales no son instrucciones de compra. Un descenso de precio no prueba una subvaluación. El perfil conservador excluye cripto y renta variable. Antes de ofrecer recomendaciones personalizadas a clientes hay que revisar el encuadre ante CNV.

Las carteras de este prototipo son compartidas y se guardan en memoria: requieren autenticación y persistencia por usuario antes de un despliegue público con datos personales.

## Estado para colaboradores

El proyecto se puede versionar y compartir como prototipo. El inicio muestra un carrusel de precios y tarjetas de noticias con selector de idioma; las noticias se ordenan por fecha, sin clasificación automática de impacto. El simulador distribuye el monto mediante reglas del perfil; todavía no ajusta los porcentajes según noticias y precios ni utiliza un servicio de IA.

Se verificaron TypeScript, 28 pruebas y la codificación UTF-8. La revisión del navegador confirmó precios de cripto y dólares y noticias en ambos idiomas. La última compilación de producción quedó bloqueada por un error de permisos de Windows (EPERM); comprobar `npm run build` en el equipo o entorno de destino antes de desplegar.

Las dependencias, compilaciones, cachés, claves privadas y archivos de entorno locales se excluyen con `.gitignore`. Los `.env.example` se incluyen para configurar cada instalación. Revisar también cualquier archivo nuevo antes de publicarlo.

El respaldo de noticias en español utiliza el RSS oficial del Banco de España. Fuente y condiciones: https://www.bde.es/wbe/es/pie/aviso-legal/. La información original se obtiene gratis en su sitio; se muestran titulares originales y enlaces a la fuente en una ventana independiente. Si se incorpora una suscripción paga, debe informarse esa disponibilidad gratuita antes del pago.
