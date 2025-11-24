import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const userData = await api.getMe();
                if (userData) {
                    setUser(userData);
                } else {
                    localStorage.removeItem('token');
                }
            }
        } catch (err) {
            console.error("Auth check failed", err);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            const data = await api.login(username, password);
            localStorage.setItem('token', data.token);
            setUser(data.user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const register = async (username, password) => {
        try {
            const data = await api.register(username, password);
            localStorage.setItem('token', data.token);
            setUser(data.user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('token');
    };

    const updateUser = (userData) => {
        setUser(userData);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser, checkUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
