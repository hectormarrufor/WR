import { Paper } from '@mantine/core'
import React from 'react'

const PaddedPaper = ({children}) => {
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsMobile(window.innerWidth <= 768);
        }
    }, []);

    return (
        <Paper
            mx={isMobile ? 0 : 40}
            mt={isMobile ? 30 : 40}
            p={isMobile ? 4 : 'md'}
            withBorder
            shadow="md"
            radius={isMobile ? 0 : "md"}
            style={{ minHeight: '90vh' }}
        >
            {children}
        </Paper>
    )
}

export default PaddedPaper