# Frei Online

Frontend do vestibular (Vite + React): portal do candidato e painel `/admin`. A API é o repositório
irmão `../nsf-app-v3`.

## Regra de ouro: mudou, documentou

**Toda funcionalidade nova e toda mudança de regra é documentada na mesma tarefa em que o código
muda.** O trabalho só está pronto quando as specs dizem o que o código faz. Remoção também é
mudança: apague ou marque como removido o que deixou de existir.

| O que mudou | Onde documentar |
|---|---|
| Tela ou fluxo do candidato ou do painel | `specs/features-usecases.md` |
| Componente, hook ou utilitário | `specs/components.md` |
| Rota, serviço de API, sessão ou convenção | `specs/architecture.md` |
| Regra de negócio, endpoint ou modelo de dados | specs do `../nsf-app-v3` |

- O código é a fonte da verdade: confira o comportamento antes de escrever.
- `specs/openapi.yaml` é uma **cópia** de `../nsf-app-v3/specs/openapi.yaml`: não edite aqui;
  altere lá e recopie, mantendo o cabeçalho de 3 linhas.
- `specs/prototypes/` é o handoff de design original — referência visual, não descreve o
  comportamento atual.
