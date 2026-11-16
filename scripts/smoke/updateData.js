import fs from "fs"

const POST_ID = "cdea4075-e120-4446-ae17-ce475e0d50f5"
const PASSWORD = process.argv[2]
const updatePost = `${process.env.MDPC_FUNCTIONS_URL}/update_post`

if (!PASSWORD) {
    console.error("Missing password on arguments")
} else {
    testar()
}

async function testar() {

  const form = new FormData()

  form.append("id", POST_ID)
  form.append("category", "BLOG")
  form.append("title", "Blog de test")
  form.append("preview", "Preview de teste")
  form.append(
    "content_markdown",
    `
# Post de teste

*Texto do post.*

Teste

![img](imagem1)

![img](imagem1s)
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
    new Blob([fs.readFileSync("./imagem1s.jpg")], { type: "image/jpeg" }),
    "imagem1s.jpg"
  )

  form.append("password", PASSWORD)

  const res = await fetch(updatePost, {
    method: "PUT",
    body: form
  })

  const json = await res.json()

  console.log(res.status, json)
}
