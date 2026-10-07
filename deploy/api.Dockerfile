FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY BasicLMS.csproj ./
RUN dotnet restore BasicLMS.csproj
COPY . .
RUN dotnet publish BasicLMS.csproj -c Release -o /app --no-restore /p:UseAppHost=false

# EF Core migrations bundle: applies pending migrations, creating the database if needed.
FROM build AS bundle
RUN dotnet tool install --global dotnet-ef --version 10.0.12
ENV PATH="${PATH}:/root/.dotnet/tools"
RUN dotnet ef migrations bundle --project BasicLMS.csproj --configuration Release \
    --output /efbundle --force

# docker compose --profile tools run --rm migrate
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS migrator
WORKDIR /migrator
COPY --from=bundle /efbundle ./efbundle
ENV DOTNET_BUNDLE_EXTRACT_BASE_DIR=/tmp
USER $APP_UID
ENTRYPOINT ["./efbundle"]

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .
# Named volumes copy this ownership on first mount, so uploads stay writable for the app user.
RUN mkdir -p /app/uploads && chown "$APP_UID" /app/uploads
USER $APP_UID
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "BasicLMS.dll"]
