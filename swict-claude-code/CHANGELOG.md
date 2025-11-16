# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Version update check functionality with npm registry integration
- Configuration import/export commands (JSON, YAML, encrypted formats)
- Configuration validation functionality with connectivity testing
- Enhanced Shell auto-completion support (bash/zsh)
- Interactive configuration wizard for first-time users
- Comprehensive audit logging system with user tracking
- Configuration integrity verification (SHA-256 hashing)
- Enhanced interactive menu with search and filtering
- Configuration templates for quick setup
- System health check functionality
- Code linting and test coverage tools

### Improved
- Modular architecture with separated concerns
- Enhanced error handling and user feedback
- Better security with encrypted API key storage
- Improved CLI help and documentation
- Enhanced interactive mode with more options

### Fixed
- Issues with configuration validation
- Improved handling of edge cases in file operations
- Better error messages for debugging
- Fixed issues with provider name validation
- Configuration tagging/grouping
- Health check command
- Progress bars and loading animations
- Configuration preview before switching
- Enhanced interactive menu
- Debug mode with `--debug` flag
- CI/CD pipeline with GitHub Actions
- Example configuration library

---

## [1.0.0] - 2025-11-08

### Added
- Initial release of Claude Config Switcher
- Support for multiple Anthropic API compatible providers
- Interactive mode with colorful CLI interface
- Persistent storage for provider configurations
- Secure storage of API keys
- Zero external dependencies (Node.js built-in modules only)
- Cross-platform support (macOS, Linux, Windows)
- Complete test suite (unit tests + E2E tests)
- Comprehensive documentation (9 documentation files)
- Demo script for testing

#### Core Commands
- `add` - Add new provider configuration
- `list` - List all saved configurations
- `switch <name>` - Switch to specified configuration
- `remove <name>` - Delete a configuration
- `show` - Display current active configuration
- `interactive` - Enter interactive menu mode
- `help` - Display help information

#### Supported Providers
- Anthropic official API
- OpenAI (via Anthropic compatible endpoints)
- Microsoft Azure OpenAI
- Self-hosted Anthropic API compatible services
- Third-party API proxy services

#### Architecture
- Modular design with separated concerns
- `src/configManager.js` - Configuration management
- `src/validators.js` - Input validation
- `src/ui.js` - User interface
- `src/constants.js` - Constants definition

#### Security Features
- API key encryption
- File permission control (600)
- Secure configuration storage

---

## [Unreleased]

### Planned for v1.1.0
- npm package publishing
- Version update notification
- Improved test coverage
- Shell auto-completion
- Configuration wizard

### Planned for v1.2.0
- Configuration import/export
- Configuration validation
- Enhanced interactive menu
- Configuration tags/grouping

### Planned for v1.3.0
- System keychain integration
- Audit logging
- Configuration integrity verification
- Recently used tracking

### Planned for v2.0.0
- Configuration synchronization
- Multi-language support
- Plugin system
- Web UI (optional)

---

## Types of Changes

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes
