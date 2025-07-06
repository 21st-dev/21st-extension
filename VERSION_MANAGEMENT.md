# 📦 Version Management Guide

This document outlines the versioning strategy and release procedures for the 21st Extension project.

## 🏗️ Project Structure

The project is organized as a monorepo with multiple packages that follow different versioning schemes:

### 📋 Package Categories

#### 1. **Core Toolbar Packages** (Semantic Release: `0.5.x`)
- `@21st-extension/toolbar` (core)
- `@21st-extension/toolbar-react`
- `@21st-extension/toolbar-vue`
- `@21st-extension/toolbar-next`

#### 2. **Plugin Packages** (Semantic Release: `0.5.x`)
- `@21st-extension/react`
- `@21st-extension/vue`
- `@21st-extension/angular`
- `@21st-extension/plugin-example`

#### 3. **Infrastructure Packages** (Independent Versioning)
- `@21st-extension/srpc` (current: `0.2.x`)
- `@21st-extension/extension-toolbar-srpc-contract` (current: `0.1.x`)
- `@21st-extension/ui` (internal: `0.0.0`)
- `@21st-extension/typescript-config` (internal: `0.0.0`)

## 🔄 When to Bump Versions

### 🚀 **Major Release (x.0.0)**
**When:** Breaking changes that affect public APIs
**Examples:**
- Changing plugin interface structure
- Removing deprecated features
- Major dependency updates with breaking changes

**Process:**
```bash
# Update all toolbar and plugin packages
find . -name "package.json" -path "*/toolbar/*" -o -path "*/plugins/*" | \
  xargs sed -i '' 's/"version": "0\.5\.[0-9]*"/"version": "1.0.0"/g'
```

### ⬆️ **Minor Release (0.x.0)**
**When:** New features without breaking existing functionality
**Examples:**
- Adding new IDE support (like Trae IDE, Kilo Code)
- New plugin capabilities
- New toolbar features

**Process:**
```bash
# Increment minor version for all toolbar and plugin packages
# From 0.5.11 → 0.6.0
```

### 🐛 **Patch Release (0.5.x)**
**When:** Bug fixes, small improvements, documentation updates
**Examples:**
- UI fixes
- Performance improvements
- Documentation updates
- Security patches

**Process:**
```bash
# Increment patch version for all toolbar and plugin packages
# From 0.5.11 → 0.5.12
```

## 📝 Release Checklist

### ✅ **Before Release**
1. **Update Versions**
   ```bash
   # For toolbar and plugin packages (0.5.x)
   grep -r "0\.5\.[0-9]*" */package.json
   
   # For infrastructure packages (independent)
   # @21st-extension/srpc: 0.2.x → 0.2.(x+1)
   # @21st-extension/extension-toolbar-srpc-contract: 0.1.x → 0.1.(x+1)
   ```

2. **Update Dependencies**
   ```bash
   pnpm install
   ```

3. **Build & Test**
   ```bash
   pnpm build
   pnpm test
   ```

4. **Update Documentation**
   - Update README files if new features added
   - Update CHANGELOG.md
   - Update version references in docs

### 🚢 **Release Process**

1. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(release): bump versions to 0.5.12
   
   - Update toolbar packages to 0.5.12
   - Update plugin packages to 0.5.12
   - Update srpc to 0.2.4
   - Update extension-toolbar-srpc-contract to 0.1.4"
   ```

2. **Create Release Branch** (for major/minor releases)
   ```bash
   git checkout -b release/0.5.12
   git push origin release/0.5.12
   ```

3. **Tag Release**
   ```bash
   git tag v0.5.12
   git push origin v0.5.12
   ```

## 🔍 **Quick Commands**

### Find All Package Versions
```bash
find . -name "package.json" -exec grep -H '"version"' {} \; | grep "@21st-extension"
```

### Update All Toolbar/Plugin Packages
```bash
# From 0.5.11 to 0.5.12
find . -name "package.json" \( -path "*/toolbar/*" -o -path "*/plugins/*" \) -exec sed -i '' 's/"version": "0\.5\.11"/"version": "0.5.12"/g' {} \;
```

### Update Infrastructure Packages
```bash
# SRPC package
sed -i '' 's/"version": "0\.2\.3"/"version": "0.2.4"/g' packages/srpc/package.json

# Extension-Toolbar SRPC Contract
sed -i '' 's/"version": "0\.1\.3"/"version": "0.1.4"/g' packages/extension-toolbar-srpc-contract/package.json
```

## 🎯 **Version Patterns**

| Package Type | Pattern | Example | Notes |
|--------------|---------|---------|-------|
| Toolbar Core | `0.5.x` | `0.5.12` | Synchronized releases |
| Plugins | `0.5.x` | `0.5.12` | Follow toolbar versions |
| SRPC | `0.2.x` | `0.2.4` | Independent versioning |
| Contract | `0.1.x` | `0.1.4` | Independent versioning |
| Internal | `0.0.0` | `0.0.0` | Not published |

## ⚠️ **Important Notes**

- **Always** update `pnpm-lock.yaml` after version changes
- **Test** the extension build after version updates
- **Coordinate** releases with team members
- **Document** breaking changes in CHANGELOG.md
- **Follow** [Semantic Versioning](https://semver.org/) principles

## 🤝 **Contributing**

When adding new features:
1. Add feature implementation
2. Update relevant package versions according to this guide
3. Update documentation
4. Follow commit message conventions
5. Test thoroughly before release

---

**Last Updated:** January 2025  
**Maintainer:** 21st Labs Inc. 