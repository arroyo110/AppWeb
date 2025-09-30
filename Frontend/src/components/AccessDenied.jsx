import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaArrowLeft, FaHome } from 'react-icons/fa';

const AccessDenied = ({ mensaje = "No tienes permisos para acceder a esta página" }) => {
    const navigate = useNavigate();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#f8f9fa',
            padding: '20px',
            textAlign: 'center'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '40px',
                borderRadius: '10px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                maxWidth: '500px',
                width: '100%'
            }}>
                <div style={{
                    fontSize: '80px',
                    color: '#dc3545',
                    marginBottom: '20px'
                }}>
                    <FaLock />
                </div>
                
                <h1 style={{
                    color: '#343a40',
                    marginBottom: '20px',
                    fontSize: '28px'
                }}>
                    Acceso Denegado
                </h1>
                
                <p style={{
                    color: '#6c757d',
                    marginBottom: '30px',
                    fontSize: '16px',
                    lineHeight: '1.5'
                }}>
                    {mensaje}
                </p>
                
                <div style={{
                    display: 'flex',
                    gap: '15px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            transition: 'background-color 0.3s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
                    >
                        <FaArrowLeft />
                        Volver
                    </button>
                    
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            transition: 'background-color 0.3s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                    >
                        <FaHome />
                        Inicio
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;
