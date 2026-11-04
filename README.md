# Taller Norte · A/B sin duplicar URLs

Landing de una escuela de oficios (ficticia) que prueba **dos mensajes sobre la misma oferta** sin fabricar páginas duplicadas: una sola URL indexable (`/practica`), asignación estable por visitante y un log de eventos en Postgres.

- **A · Control**: habla del método.
- **B · Tratamiento**: apura la decisión con fecha y cupo.
- **La oferta no cambia**: 14 de abril, 8 semanas, grupos de 12, carpintería, electricidad y cocina.

## Arranque rápido (Docker)

```bash
docker compose up -d --build
```

- Landing: http://localhost:3000/practica
- Bitácora: http://localhost:3000/bitacora

Si el puerto 3000 está ocupado: `WEB_PORT=3100 docker compose up -d --build`.

El contenedor `web` aplica el esquema (`db/schema.sql`) al arrancar. Los eventos persisten en el volumen `events-data`.

## Desarrollo local

```bash
docker compose up -d db          # solo Postgres en localhost:5432
cp .env.example .env.local
npm install
npm run db:migrate
npm run dev
npm test                          # tests del dominio (vitest)
```

## Cómo funciona

| Archivo | Responsabilidad |
|---|---|
| `proxy.ts` | Asigna visitante y variante en el primer request sin cookie. Anota una impresión por sesión de 30 minutos. |
| `lib/experiment.ts` | Copy, oferta, caso fijo, hash estable, tasa, formatos y validación de lo que se lee. Funciones puras. |
| `lib/events.ts` | Log de eventos en Postgres: impresión, conversión y conteos validados. |
| `lib/db.ts` | Pool de conexiones. |
| `lib/request-variant.ts` | Header interno con el que el proxy le pasa la variante a la página. |
| `app/practica/page.tsx` | Landing. Title, description, canonical y `noindex` del preview, todo en el servidor. |
| `app/practica/actions.ts` | Server action del CTA: una conversión por visitante. |
| `app/bitacora/page.tsx` | Impresiones, conversiones, tasa y diferencia en pp. Caso fijo y verificación del hash. |
| `components/` | Mensaje, oferta y botón. |

### Asignación

- Visitante: UUID aleatorio en la cookie `tn_visitor` (httpOnly, `Path=/practica`, 30 días).
- Variante: **FNV-1a de 32 bits** sobre los bytes UTF-8 del identificador. Hash par → A, impar → B. Se guarda en `tn_variant`, pero siempre se recalcula desde el visitante: si alguien la edita, se corrige.
- La variante **nunca** viaja en la URL.
- `lab-visitor-demo-01` → `0xe13ebb3b` (impar) → **B**, siempre. Está fijado en `lib/experiment.test.ts` y se muestra en la bitácora.

### Medición

- **Impresión**: una por sesión de 30 minutos (cookie `tn_session` + índice único por sesión en la base). Recargar no suma. Los prefetch, el preview y los crawlers no cuentan.
- **Conversión**: solo desde el CTA, una por visitante (índice único parcial). Requiere una impresión previa del mismo visitante. Cargar la página nunca convierte.
- **Tasa**: conversiones / impresiones. Sin impresiones, la tasa no existe ("Sin impresiones", no 0%).
- No se declara ganador: una diferencia en pp no es una prueba.

### SEO

- Title y description de la variante, en el `<head>` del primer response (`htmlLimitedBots: /.*/` desactiva el streaming de metadata). El title es absoluto: sin el sufijo del layout.
- Canonical siempre `/practica`, sin query.
- `?preview=a` / `?preview=b`: muestran una pieza, no escriben cookies, no cuentan visita y llevan `noindex, nofollow`.
- Crawlers: reciben el control, en la misma URL y con el mismo canonical. Ver [`docs/informe-seo.md`](docs/informe-seo.md).
- `robots.txt` deja indexar `/practica` y excluye `/bitacora`. El sitemap lista una sola URL.

### Vista previa embebida (iframe)

Con `EMBEDDED_PREVIEW=1` las cookies salen `SameSite=None; Secure`. En una pestaña normal alcanza con `SameSite=Lax`.

## Verificación manual

| Prueba | Resultado esperado |
|---|---|
| Recargar `/practica` | La variante no cambia. |
| Borrar cookies y volver | Puede tocar la otra variante: es otro visitante. |
| `?preview=b` | Se ve B. No hay `Set-Cookie`. |
| Salir del preview | Vuelve la variante asignada. |
| Ver el HTML | Title y description de la variante. Canonical `/practica`. |
| HTML del preview | `noindex, nofollow`. |
| Recargar dentro de 30 min | No suma impresión. |
| Clic en el CTA dos veces | Una sola conversión. |
| `/bitacora` sin sesión | Caso fijo: 7,50%, 13,14% y 5,64 pp. |

```bash
curl -s http://localhost:3000/practica | grep -oE '<title>[^<]*</title>|<link rel="canonical"[^>]*>'
curl -s "http://localhost:3000/practica?preview=b" | grep -o '<meta name="robots"[^>]*>'
```
