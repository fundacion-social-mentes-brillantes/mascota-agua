# El reloj de los avisos (Azure Functions)

## Por qué existe esto

La app vive en Vercel y ahí funciona bien. El único problema es el
**temporizador**: el plan gratis de Vercel permite **un solo cron al día**, y
para recordarle a alguien que tome agua hace falta mirar cada media hora.

Mover toda la app a Azure sería rehacer lo que ya funciona para arreglar un
reloj. Así que aquí va **solo el reloj**: una función diminuta que se despierta
cada 30 minutos y le da un toque a la app. Toda la lógica —quién necesita el
aviso, qué decirle, si está durmiendo— sigue viviendo en la app.

En el plan de consumo de Azure esto cuesta **cero**: el primer millón de
ejecuciones al mes es gratis, y esto usa unas 1.500.

## Qué hace, en una línea

Cada 30 minutos llama a `https://mascota-agua.vercel.app/api/avisar?clave=…`
y anota qué respondió. Nada más.

## Cómo se publica

1. Instalar las herramientas (una sola vez):

```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

2. Crear la función en Azure (una sola vez). Cambia el nombre si lo quieres
   distinto; tiene que ser único en todo Azure:

```bash
az login
az group create --name mascota-agua --location eastus
az storage account create --name mascotaaguareloj --location eastus --resource-group mascota-agua --sku Standard_LRS
az functionapp create --resource-group mascota-agua --consumption-plan-location eastus --runtime node --runtime-version 20 --functions-version 4 --name mascota-agua-reloj --storage-account mascotaaguareloj
```

3. Guardar los datos que necesita (la clave es la misma `CRON_SECRET` que está
   en Vercel):

```bash
az functionapp config appsettings set --name mascota-agua-reloj --resource-group mascota-agua --settings "URL_AVISAR=https://mascota-agua.vercel.app/api/avisar" "CRON_SECRET=EL_MISMO_DE_VERCEL"
```

4. Publicar, desde esta carpeta:

```bash
func azure functionapp publish mascota-agua-reloj
```

## Cómo saber si está funcionando

En el portal de Azure, en la función `avisar`, la pestaña de **Invocations**
muestra cada ejecución con lo que respondió la app: cuántas personas revisó y
a cuántas les mandó el empujón.

## Si prefieres no usar Azure

Make también sirve y no hay que instalar nada: un módulo de horario cada 30
minutos + un módulo HTTP apuntando a esa misma dirección. Con el plan gratuito
de ONG que ya está activo sobra de largo.
