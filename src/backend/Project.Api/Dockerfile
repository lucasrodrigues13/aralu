# dotnet/sdk:10.0 fixado por digest (Dependabot atualiza)
FROM mcr.microsoft.com/dotnet/sdk:10.0@sha256:8c6edfb26c85153f236d26efebd9ad349aec403583f343f201ee67838b23658d AS build
WORKDIR /src
COPY nuget.config Directory.Build.props ./
COPY src/backend/Project.Domain/Project.Domain.csproj src/backend/Project.Domain/
COPY src/backend/Project.Application/Project.Application.csproj src/backend/Project.Application/
COPY src/backend/Project.Infrastructure/Project.Infrastructure.csproj src/backend/Project.Infrastructure/
COPY src/backend/Project.Api/Project.Api.csproj src/backend/Project.Api/
COPY src/backend/Project.Domain/packages.lock.json src/backend/Project.Domain/
COPY src/backend/Project.Application/packages.lock.json src/backend/Project.Application/
COPY src/backend/Project.Infrastructure/packages.lock.json src/backend/Project.Infrastructure/
COPY src/backend/Project.Api/packages.lock.json src/backend/Project.Api/
RUN dotnet restore src/backend/Project.Api/Project.Api.csproj --locked-mode
COPY src/backend/ src/backend/
RUN dotnet publish src/backend/Project.Api/Project.Api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

# dotnet/aspnet:10.0 fixado por digest
FROM mcr.microsoft.com/dotnet/aspnet:11.0@sha256:ca396ece3f2a2e62c7a03f1d7d710b8bc7e8c9dea5597d091178d9f5bfca13f0
WORKDIR /app
COPY --from=build /app .
# Volume nomeado herda o dono deste diretório. A API roda como APP_UID.
RUN mkdir -p /keys /storage \
    && chown "$APP_UID:$APP_UID" /keys /storage \
    && chmod 700 /keys /storage
ENV ASPNETCORE_URLS=http://+:8080
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Project.Api.dll"]
