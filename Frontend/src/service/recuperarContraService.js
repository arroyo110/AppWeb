const BASE_URL = "http://127.0.0.1:8000/api/codigo-recuperacion/"

export async function solicitar_codigo_recuperacion(correo_electronico) {
  try {
    const response = await fetch(`${BASE_URL}solicitar-codigo/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        correo_electronico,
      }),
    })

    if (!response.ok) {
      const contentType = response.headers.get("content-type")
      let errorMessage = "Error al solicitar el código"

      if (contentType && contentType.includes("application/json")) {
        const error = await response.json()
        errorMessage = error.detail || errorMessage
      } else {
        const text = await response.text()
        errorMessage = text || errorMessage
      }

      throw new Error(errorMessage)
    }

    // Opcional: puedes retornar algo si la API responde con éxito
    return await response.json().catch(() => null)
  } catch (error) {
    console.error("Error al solicitar el codigo: ", error)
    throw error
  }
}

export async function cambiar_contrasena(codigo, correo_electronico, password) {
  try {
    const response = await fetch(`http://127.0.0.1:8000/api/codigo-recuperacion/confirmar-codigo/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codigo: codigo,
        correo_electronico: correo_electronico,
        nueva_password: password,
      }),
    })

    if (!response.ok) {
      const contentType = response.headers.get("content-type")
      let errorMessage = "Error al cambiar la contraseña"

      if (contentType && contentType.includes("application/json")) {
        const error = await response.json()
        errorMessage = error.detail || errorMessage
      } else {
        const text = await response.text()
        errorMessage = text || errorMessage
      }
      throw new Error(errorMessage)
    }

    return await response.json().catch(() => null)
  } catch (error) {
    console.error("Error al cambiar la contraseña: ", error)
    throw error
  }
}