Это вырезка из ХОСТ приложения, которое будет подтягивать микрофронт этот 
# SberDrug Web Platform

> **Project Name**: `friend-web-platform` (aka СберДруг)  
> **Version**: 04.152.0  
> **License**: ISC (Internal Sberbank project)  
> **Repository**: `ssh://git@stash.sigma.sbrf.ru:7999/friend/sberdrug-web-main.git`

---

## Project Overview

This is a **React-based Single Page Application (SPA)** for the SberDrug platform - a Russian healthcare and pharmaceutical services application. The project uses modern web technologies with a focus on enterprise-scale architecture.

### Key Technologies

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js 22.22.2 (See Jenkinsfile for production builds) |
| **Framework** | React 18.x with TypeScript 6.0.3 |
| **State Management** | MobX 6.16.1 |
| **Routing** | react-router |
| **UI Library** | Material-UI (via `@sber-friend/flamingo-components` 4.11.0) |
| **Build Tool** | RSBuild (based on Rspack/Webpack 5) |
| **Module Federation** | `@module-federation/enhanced` 2.5.1 |
| **Testing** | Jest + Enzyme |
| **Code Quality** | Biome (formatter/linter), ESLint, TypeScript |

### Architecture Highlights

- **Module Federation**: Uses `@sber-friend/mf-config` for micro-frontend architecture
- **Feature-based structure**: Features/modules are organized as top-level directories under `src/`
- **Agent pattern**: Server communication is abstracted via `_agents` folders (one per module)
- **Internationalization**: Built-in i18n support for Russian (`ru-RU`) and English (`en-US`)
- **Theme system**: Custom theme system using Material-UI styling

---