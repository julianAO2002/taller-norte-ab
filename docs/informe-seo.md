# Informe: una landing, dos mensajes, una sola URL indexable

## 1. Qué ve una persona asignada a B

Una persona en B ve otro mensaje sobre la misma oferta:

- **Titular**: "El curso empieza el 14 de abril. El cupo, no."
- **Llamado a la acción**: "Reservar mi lugar".
- **Title**: "Abril abre cupos: cursos de oficio en grupos de 12" (50 caracteres).
- **Description**: "El 14 de abril empiezan grupos de doce. En la cohorte anterior, ocho de cada diez consiguieron trabajo en el rubro antes de los noventa días." (141 caracteres).

Lo que **no cambia** es la oferta: empieza el 14 de abril, dura 8 semanas, los grupos son de 12 personas y los oficios son carpintería, electricidad y cocina. Cambia cómo se cuenta, no qué se vende. Si cambiara la oferta, ya no sería el mismo experimento. La URL también es la misma: `/practica`. La variante vive en una cookie httpOnly, no en la dirección.

## 2. Qué debería ver un crawler

El crawler tiene que ver **siempre la variante de control (A), en la misma URL y con el mismo canonical**. Un crawler suele no conservar cookies: cada visita suya llega como un visitante nuevo. Si a cada visita sin cookie se le asignara un visitante nuevo, el buscador recibiría a veces A y a veces B, e indexaría un title y una description inestables. Por eso el proxy detecta los user agents de crawlers, no les asigna visitante, no les escribe cookies, no les cuenta impresión y les sirve el control.

Esto **no es cloaking**. Cloaking es mostrarle al buscador un contenido distinto del que ve la persona para manipular el ranking. Acá el crawler ve uno de los dos mensajes que ven personas reales, sobre la misma oferta, en la misma URL y con el mismo canonical. No hay contenido escondido ni preparado para el bot: lo que se fija es cuál de las dos piezas legítimas se indexa, para que el índice sea estable.

Además, title y description se publican en el servidor, dentro del `<head>` del primer response. Si se escribieran con JavaScript después de cargar, el crawler se quedaría con el title genérico.

## 3. Por qué el canonical no cambia

Las dos variantes son **la misma página**: misma oferta, mismo propósito, misma intención de búsqueda. Solo cambia el mensaje. Si se publicaran dos rutas (`/variante-a`, `/variante-b`) o se canonizara el query (`?variant=b`), el buscador vería dos documentos casi iguales compitiendo entre sí: se fabrican duplicados, la autoridad de los enlaces se reparte y la indexación se diluye. Además, el experimento se rompe, porque quien comparte o guarda la URL fija una variante para otros.

Por eso el canonical apunta siempre a `/practica`, sin query. El `?preview=a|b` existe solo como instrumento para revisar las dos piezas: no escribe cookies, no cuenta como visita y lleva `noindex, nofollow`.

## Función de hash y prueba de estabilidad

Asignación: **FNV-1a de 32 bits** (offset basis `0x811c9dc5`, primo `0x01000193`) sobre los bytes UTF-8 del identificador del visitante. Hash par → A, hash impar → B.

| Corrida | Identificador | FNV-1a | Variante |
|---|---|---|---|
| 1 | `lab-visitor-demo-01` | `0xe13ebb3b` | B |
| 2 | `lab-visitor-demo-01` | `0xe13ebb3b` | B |
| 3 | `lab-visitor-demo-01` | `0xe13ebb3b` | B |

Repetir el mismo identificador no cambia el resultado. La bitácora (`/bitacora`) recalcula esta tabla en cada carga.
