require('dotenv').config();


export async function httpGet(url) {
    console.log(url);
    
    try {
        const response = await fetch(url)
        return response.json();
    } catch (error) {
        console.error('error al obtener datos: ', error);
        throw error;
    }
}

export async function httpPost(url, object) {
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...object }),
        });

        return response.json();
    } catch (error) {
        console.error('Error en POST:', error);
        throw error;
    }
}

export async function httpPut(url, object) {
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(object),
        });

        return response.json();
    } catch (error) {
        console.error(`Error en PUT:`, error);
        throw error;
    }

    
}

export async function httpDelete(url) {
  try {
    const response = await fetch(url, {
      method: 'DELETE',
    });


    return response.json();
  } catch (error) {
    console.error(`Error en DELETE:`, error);
    throw error;
  }
}