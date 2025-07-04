"use client"
import { Button, Card, Flex, Title } from '@mantine/core'
import React from 'react'
import styles from './superuser.css'
import { useRouter } from 'next/navigation';

const superuser = () => {
    const router = useRouter();
    return (
        <Card
            style={{
                height: "50vh",
                backgroundColor: "white"
            }}
          
            m={100}
            

        >
            <Title justify="center" align="center">Administracion</Title>
            <Flex justify="space-around" align="center">
                <Button m={120} className={styles.superuserbtn} onClick={() => router.push('/superuser/flota')}>Flota</Button>
                <Button m={120} className={styles.superuserbtn} onClick={() => router.push('/superuser/usuarios')}>Usuarios</Button>
                <Button m={120} className={styles.superuserbtn} onClick={() => router.push('/superuser/orders')}>Orders</Button>
            </Flex>
        </Card>
    )
}

export default superuser