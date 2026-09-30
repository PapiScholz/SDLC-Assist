# Intent: ¿conviene alinear el skill `sdlc` con la sección "Plays" del AI-native SDLC playbook?

Who:              Ezequiel Scholz, owner and maintainer of SDLC-Assist
Problem:          Leí la sección "Plays" (`#sd-c2`) del playbook y quiero saber si el repo la sigue. Sigue la idea central (artefactos versionados, confirmación humana en las puertas) pero no usa su vocabulario y le faltan dos piezas de proceso: el artefacto que abre un ciclo para una idea, y la entrada desde producción. Además, un segundo contribuidor no tiene la protección que yo tengo con mi hook global de git, y cada doc lleva su propia copia del loop de gates.
Desired outcome:  Un usuario que leyó el playbook encuentra su vocabulario en el skill (`intent.md`, fases con governance y medidas, una entrada `maintain`); un contribuidor corre un solo comando para todas las gates y lo frenan los mismos hooks que a mí. Publicado como v0.3.0.
Constraints:      Barato y portable: markdown, scripts Node sin dependencias, un `gates.sh`. Sin bucle Maintain automático, sin evals en CI, sin `REVIEW.md`, sin `.claude/agents/`, sin scans: eso es infraestructura del usuario. Codex y Cursor siguen en backlog. Los scripts de inferencia no cambian.
Open questions:   Si conviene gatear `git add` en el hook versionado (hoy no, es reversible). Si el hook versionado debe cubrir comandos ofuscados o sólo descuidos del agente.
