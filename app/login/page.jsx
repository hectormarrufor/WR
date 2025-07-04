"use client"
import React, { useEffect, useState } from 'react'
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Paper, Title, Container, Button, Group, Image } from '@mantine/core'
import { useRouter } from 'next/navigation';
import { cerrarSesion, checkSession, iniciarSesion } from '../ApiFunctions/userServices';
import useAuth from '../../hooks/useAuth';
import { notifications } from '@mantine/notifications';

const page = () => {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuth();
  const form = useForm({
    initialValues: {
      user: '',
      password: '',
    },

    validate: {
      // email: (value) =>
      //   /^\S+@\S+$/.test(value) ? null : 'Correo electrónico inválido',
      password: (value) =>
        value.length < 4 ? 'La contraseña debe tener al menos 4 caracteres' : null,
    },
  });

  const handleSubmit = async (values) => {
    // Aquí puedes manejar la lógica de autenticación
    
    try {
      const fetch = await iniciarSesion(values.user, values.password);
      if (!fetch.error) {
        notifications.show({ title: "Exito", message: "redirecting" , color: "green"});
        router.push('/')}
        else throw new Error (fetch.error);
    }

    catch (error) {
      console.error('Error: ', error.message)
      notifications.show({ title: "Usuario o contraseña incorrecto", message: error.message});

    }
    // setIsAuthenticated(await checkSession());

  };

  return (
    <>
      <Container size={420} my={50}   >
        <Title
          align="center"
          pt={150}
          style={{ fontFamily: 'Greycliff CF, sans-serif', fontWeight: 900 }}
        >
          Bienvenido/a
        </Title>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <TextInput
              label="Usuario"
              placeholder="escribe tu usuario"
              required
              {...form.getInputProps('user')}
            />

            <PasswordInput
              label="Contraseña"
              placeholder="Ingresa tu contraseña"
              required
              mt="md"
              {...form.getInputProps('password')}
            />

            <Group position="apart" mt="lg">
              <Button type="submit" fullWidth>
                Iniciar Sesion
              </Button>
              <Button fullWidth onClick={() => router.push('/register')}>
                Registrar
              </Button>
              {/* {isAuthenticated && <Button fullWidth onClick={() => cerrarSesion(router.push, checkAuth)}>
                Close session
              </Button>} */}
            </Group>
          </form>
        </Paper>
      </Container>
    </>
  )
}

export default page