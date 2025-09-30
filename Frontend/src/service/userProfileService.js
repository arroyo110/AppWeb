import axios from 'axios';
import { apiConfig } from './apiConfig';

const BASE_URL = apiConfig.baseURL;

// Actualizar perfil de usuario
export const updateUserProfile = async (userId, profileData) => {
  try {
    const response = await axios.put(`${BASE_URL}usuarios/${userId}/perfil/`, profileData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    throw error;
  }
};

// Cambiar contraseña de usuario
export const changeUserPassword = async (userId, passwordData) => {
  try {
    const response = await axios.post(`${BASE_URL}usuarios/${userId}/cambiar-password-perfil/`, passwordData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    throw error;
  }
};

// Obtener perfil de usuario
export const getUserProfile = async (userId) => {
  try {
    const response = await axios.get(`${BASE_URL}usuarios/${userId}/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    throw error;
  }
};

export default {
  updateUserProfile,
  changeUserPassword,
  getUserProfile
};
