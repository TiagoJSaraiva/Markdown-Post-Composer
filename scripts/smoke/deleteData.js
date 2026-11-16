const POST_ID = "cdea4075-e120-4446-ae17-ce475e0d50f5"
const PASSWORD = process.argv[2]
const deletePost = `${process.env.MDPC_FUNCTIONS_URL}/delete_post`

if (!PASSWORD) {
    console.error("Missing password on arguments")
} else {
    testar()
}

async function testar() {

  try {

    const res = await fetch(deletePost, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: POST_ID,
        password: PASSWORD
      })
    })

    const text = await res.text()

    let data

    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    console.log("STATUS:", res.status)
    console.log("RESPOSTA:", data)

  } catch (err) {
    console.error("ERRO NA REQUISIÇÃO:", err)
  }

}

