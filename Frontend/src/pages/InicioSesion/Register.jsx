import RegisterForm from "./RegisterForm"
import "../../styles/Register.css" // Importamos el nuevo CSS específico
import logo from "../../assets/logo2.svg"

const Register = () => {
  return (
    <div className="register-page">
      <div className="register-background">
        <div className="glass-effect"></div>
        <div className="background-decoration"></div>
      </div>

      <div className="register-container">
        <div className="register-header">
          <img src={logo} alt="Wine Spa Logo" className="register-logo" />
          <h1 className="register-title">
            <span className="wine-text">Wine</span>
            <span className="spa-text">Spa</span>
          </h1>
          <p className="register-subtitle">Crea tu cuenta y comienza a gestionar tus reservas</p>
        </div>

        <RegisterForm />
      </div>
    </div>
  )
}

export default Register
