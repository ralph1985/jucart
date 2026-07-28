# Auditoría de seguridad de dependencias

Este documento describe las medidas de Jucart para reducir el riesgo de vulnerabilidades y de incorporar dependencias comprometidas. No sustituye la revisión de las actualizaciones propuestas por Dependabot.

## Estado y controles

- El proyecto usa `pnpm@10.25.0`, declarado en `package.json`.
- `pnpm-lock.yaml` fija el grafo de dependencias e incluye hashes de integridad.
- `pnpm-workspace.yaml` define `minimumReleaseAge: 10080`, equivalente a siete días. La espera se aplica a dependencias directas y transitivas.
- El lockfile fija `brace-expansion@5.0.8` mediante overrides; además, `filelist@1.0.6` usa `minimatch@10.2.5` para evitar su rama antigua vulnerable.
- Dependabot revisa semanalmente las dependencias npm y las acciones de GitHub, agrupando cambios minor y patch.
- Las alertas de vulnerabilidades de Dependabot están activadas en GitHub.
- El workflow `project-quality` instala con `--frozen-lockfile`, ejecuta `pnpm audit --audit-level moderate` y valida tipos, lint, formato, tests y build.
- El hook local `pre-push` ejecuta cobertura y tests E2E antes de publicar cambios.

## Auditoría manual

Desde la raíz del repositorio:

```sh
pnpm audit --audit-level moderate
```

Una vulnerabilidad moderada o superior debe revisarse antes de aceptar una actualización. La corrección debe conservar el lockfile y pasar el workflow de calidad.

## Excepciones

`brace-expansion` tiene una excepción puntual en `minimumReleaseAgeExclude` para permitir la versión exacta `5.0.8`, que corrige la vulnerabilidad de DoS reportada por npm. El override mantiene esa versión fijada. La excepción debe retirarse cuando la versión haya superado los siete días de antigüedad.

## Referencias

- [Configuración de Dependabot](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Actualizaciones de seguridad de Dependabot](https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates)
- [Configuración `minimumReleaseAge` de pnpm](https://pnpm.io/settings#minimumreleaseage)
- [Comando `pnpm audit`](https://pnpm.io/cli/audit)
