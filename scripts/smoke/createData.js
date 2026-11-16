import fs from "fs"

const PASSWORD = process.argv[2]
const createPost = `${process.env.MDPC_FUNCTIONS_URL}/create_post`

if (!PASSWORD) {
    console.error("Missing password on arguments")
} else {
    testar()
}

async function testar() {

  const form = new FormData()

  form.append("category", "PROMOCAO")
  form.append("title", "Promocao de teste")
  form.append("preview", "Preview do post")
  form.append(
    "content_markdown",
    `
# Post de teste

*Texto do post.*

Teste

![img](imagem1)

![img](imagem2)
`
  )

  form.append(
  "banner",
  new Blob([fs.readFileSync("./banner.jpg")], { type: "image/jpeg" }),
  "banner.jpg"
  )

  form.append(
    "images",
    new Blob([fs.readFileSync("./imagem1.jpg")], { type: "image/jpeg" }),
    "imagem1.jpg"
  )

  form.append(
    "images",
    new Blob([fs.readFileSync("./imagem2.jpg")], { type: "image/jpeg" }),
    "imagem2.jpg"
  )

  form.append("password", PASSWORD)

  const res = await fetch(createPost, {
    method: "POST",
    body: form
  })

  const json = await res.json()

  console.log(res.status, json)
}
