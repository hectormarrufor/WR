import { Card } from "@mantine/core";
import Link from "next/link";

export default function notfound() {
    return (
        <Card centered>
            <h1>
                Error 404: la pagina no se consigue
            </h1>
            <Link href="/">Volver a la pagina principal</Link>
        </Card>
    );
}
