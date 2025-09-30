import { BrowserRouter } from "react-router-dom"
import { MyRoutes } from "./routers/routes"
import { AuthProvider } from "./context/authContext"
import { Toaster } from "react-hot-toast"

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MyRoutes />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            position: "top-right",
            style: {
              background: "#363636",
              color: "#fff",
              fontWeight: "500",
            },
            success: {
              duration: 4000,
              position: "top-right",
              style: {
                background: "#10b981",
                color: "#fff",
                fontWeight: "500",
              },
              iconTheme: {
                primary: "#fff",
                secondary: "#10b981",
              },
            },
            error: {
              duration: 5000,
              position: "top-right",
              style: {
                background: "#ef4444",
                color: "#fff",
                fontWeight: "500",
              },
              iconTheme: {
                primary: "#fff",
                secondary: "#ef4444",
              },
            },
            warning: {
              duration: 4000,
              position: "top-right",
              style: {
                background: "#f59e0b",
                color: "#fff",
                fontWeight: "500",
              },
              iconTheme: {
                primary: "#fff",
                secondary: "#f59e0b",
              },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
