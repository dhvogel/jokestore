docker build --platform linux/amd64 -t us-central1-docker.pkg.dev/jokestore-3c934/jokestore-dev/web:dev .

docker push us-central1-docker.pkg.dev/jokestore-3c934/jokestore-dev/web:dev

gcloud run deploy cyclequest-web-dev --image us-central1-docker.pkg.dev/cyclequest/cyclequest-dev/web:dev --region us-central1