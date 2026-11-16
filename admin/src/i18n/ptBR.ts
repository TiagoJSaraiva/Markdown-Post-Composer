import type { MessageKey } from "./en";

export const ptBR: Record<MessageKey, string> = {
  // Configuration error screen
  "config.title": "Erro de configuração",
  "config.intro": "O painel de administração não tem configurações obrigatórias. Defina estas variáveis de ambiente (veja admin/.env.example) e reinicie.",
  "config.missing": "Ausentes: {names}",
  "config.invalid": "Inválidas (devem ser uma URL http ou https): {names}",

  // Unlock screen
  "unlock.title": "Senha de administrador",
  "unlock.description": "Digite a senha de administrador para continuar.",
  "unlock.passwordLabel": "Senha",
  "unlock.submit": "Desbloquear",
  "unlock.checking": "Verificando...",
  "unlock.empty": "Informe a senha.",
  "unlock.rejected": "O servidor rejeitou a senha. Digite-a novamente para continuar.",

  // Editor panel
  "editor.newPost": "Novo post",
  "editor.editing": "Editando:",
  "editor.save": "Salvar",
  "editor.cancel": "Cancelar",
  "editor.preview": "Preview",
  "editor.markdownHelp": "Ajuda markdown",
  "editor.markdownLabel": "Markdown do post",
  "editor.clear": "Limpar",
  "editor.website": "Website",
  "editor.lock": "Bloquear",
  "editor.replaceTitle": "Substituir conteúdo?",
  "editor.replaceText": "Fazer isso vai substituir todo o conteúdo atual do container de texto.",
  "editor.continue": "Continuar",
  "editor.clearingTitle": "Limpando formulário",
  "editor.clearingText": "Limpando formulário...",
  "editor.clearErrorTitle": "Erro ao limpar o formulário",
  "editor.saveConfirmTitle": "Confirmar salvamento",
  "editor.saveConfirmCreate": "Deseja criar este post?",
  "editor.saveConfirmEdit": "Deseja salvar as alterações deste post?",
  "editor.ok": "Ok",
  "editor.savingTitle": "Salvando",
  "editor.savingText": "Enviando post, aguarde...",
  "editor.successTitle": "Sucesso",
  "editor.successMessage": "Post salvo com sucesso.",
  "editor.errorTitle": "Erro ao salvar o post",
  "editor.failureStatus": "Falha ao salvar (status {status}).",
  "editor.bannerRequired": "Selecione a imagem do card antes de salvar.",
  "editor.unexpectedError": "Erro inesperado ao salvar.",
  "editor.validation.contentEmpty": "Campo markdown_content não está preenchido",
  "editor.validation.titleEmpty": "Campo título não está preenchido",
  "editor.validation.bannerEmpty": "Campo imagem do card não está preenchido",
  "editor.validation.previewEmpty": "Campo prévia não está preenchido",
  "editor.validation.imageBadChars": "Imagem {name} contém caracteres impróprios",
  "editor.validation.imageUnused": "Imagem {name} no container de imagens não está sendo usada",
  "editor.validation.imageMissing": "Imagem {name} no texto do post não existe",
  "editor.validation.imageBusy": "Aguarde o término do envio das imagens",
  "editor.unnamedImage": "sem_nome",
  "editor.markdownHelpTemplate": `# Tutorial básico de como formatar o texto

_Pra começar, clique no botão **preview** para ver como o texto fica com a formatação aplicada!_

**Texto em negrito**\\
Usar barra invertida: \\ para forçar quebra de linha

Dar 1 linha vazia de distância entre duas linhas de texto também quebra linha.

# Exemplo de título grande

## Exemplo de título menor

### Título pequeno

<div align="center">
Para centralizar texto e imagens, use isso.

Também funciona pra centralizar imagens
</div>

Esses 3 hífens abaixo criam uma "divisão" no texto:

---

Para usar imagens:

![img](nomeDaImagem)

Dentro do parênteses, insira o nome da imagem da mesma forma  que está no container.

Para fazer lista:

- Elemento um
- Elemento dois
- Elemento três

Para fazer lista enumerada:

1. Elemento um
2. Elemento dois
3. Elemento três

Para saber  mais de markdown, clique [aqui](https://www.markdownguide.org/basic-syntax/)`,

  // Form panel
  "form.loading": "...carregando",
  "form.addImages": "Adicionar imagens",
  "form.type": "Tipo",
  "form.title": "Título",
  "form.cardImage": "Imagem do card",
  "form.excerpt": "Prévia",
  "form.active": "Ativo",

  // Image list item
  "image.replace": "Trocar Imagem",
  "image.choose": "Escolher imagem",
  "image.namePlaceholder": "Nome",
  "image.confirmName": "Confirmar nome",
  "image.remove": "Remover imagem",

  // Post list and preview panel
  "post.delete": "apagar",
  "post.edit": "editar",
  "post.active": "ativo",
  "post.inactive": "inativo",
  "preview.viewPosts": "Ver posts",
  "preview.loading": "carregando...",
  "preview.placeholder": "Preview",
  "preview.loadPostsUnexpected": "Falha inesperada ao carregar posts.",
  "preview.editConfirmTitle": "Confirmar edição",
  "preview.editConfirmText": "Deseja editar esse post? Se houver alterações não salvas no formulário atual, elas serão descartadas.",
  "preview.no": "Não",
  "preview.yes": "Sim",
  "preview.preparingTitle": "Preparando edição",
  "preview.prepareUnexpected": "Falha inesperada ao preparar edição.",
  "preview.deleteConfirmTitle": "Confirmar exclusão",
  "preview.deleteConfirmText": "Deseja apagar este post? Isso não pode ser desfeito.",
  "preview.cancel": "Cancelar",
  "preview.ok": "Ok",
  "preview.deletingTitle": "Apagando",
  "preview.deleteErrorTitle": "Erro ao apagar o post",
  "preview.deleteSuccessTitle": "Sucesso",
  "preview.deleteSuccessMessage": "Post apagado com sucesso.",
  "preview.deleteFailureStatus": "Falha ao apagar (status {status}).",
  "preview.deleteNoTarget": "Post alvo não encontrado.",
  "preview.deleteUnexpected": "Erro inesperado ao apagar.",

  // API error codes (see errors.ts)
  "error.METHOD_NOT_ALLOWED": "Método não permitido.",
  "error.FORBIDDEN_ORIGIN": "Esta origem não é permitida pelo servidor (verifique a configuração de origens permitidas).",
  "error.SERVER_MISCONFIGURED": "O servidor está mal configurado.",
  "error.INTERNAL_ERROR": "Erro interno do servidor.",
  "error.INVALID_FORM_DATA": "Dados do formulário inválidos.",
  "error.INVALID_JSON": "Corpo da requisição inválido.",
  "error.INVALID_ID": "Id do post inválido.",
  "error.MISSING_PASSWORD": "A senha de administrador não foi informada.",
  "error.WRONG_PASSWORD": "Senha incorreta.",
  "error.POST_NOT_FOUND": "Post não encontrado.",
  "error.INVALID_TITLE": "Título inválido.",
  "error.MISSING_IMAGES": "Algumas imagens usadas no texto não foram enviadas.",
  "error.DUPLICATE_IMAGE_NAME": "Duas imagens têm o mesmo nome.",
  "error.TITLE_OR_SLUG_ALREADY_EXISTS": "Já existe um post com este título.",
  "error.INVALID_EXTENSION": "Extensão de imagem inválida.",
  "error.INVALID_IMAGE_TYPE": "A imagem {file} tem um tipo inválido. Extensões aceitas: {acceptedExtensions}.",
  "error.IMAGE_TOO_LARGE": "A imagem {file} é grande demais (máximo de {maxMb} MB).",
  "error.UUID_COLLISION": "Colisão de identificador, tente novamente.",
  "error.TRANSIENT_ERROR_RETRY_FAILED": "Erro temporário no servidor, tente novamente.",
  "error.INVALID_ACTION": "Ação inválida.",
  "error.INVALID_PATH": "Caminho de imagem inválido.",
  "error.INVALID_NAME": "Nome de imagem inválido.",
  "error.MISSING_FILE": "Nenhum arquivo foi enviado.",
  "error.TEMP_IMAGE_NOT_FOUND": "Imagem temporária não encontrada.",
  "error.TEMP_IMAGE_ALREADY_EXISTS": "Já existe uma imagem temporária com este nome.",
  "error.POST_IMAGE_NOT_FOUND": "Imagem do post não encontrada.",
  "error.NETWORK_ERROR": "Não foi possível acessar o servidor. Verifique sua conexão e a URL das functions.",
  "error.INVALID_RESPONSE": "Resposta inesperada do servidor.",
  "error.UNKNOWN": "Erro inesperado ({code}).",
  "error.generic": "Erro inesperado."
};
