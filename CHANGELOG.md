# Changelog

All notable changes to `@jutech-devs/api-rate-limiter` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation suite
- Performance benchmarking tools
- Memory usage optimization guides

### Changed
- Improved TypeScript definitions
- Enhanced error messages

### Fixed
- Memory leak in sliding window cleanup
- Race condition in token bucket refill

## [1.0.0] - 2024-01-15

### Added
- Initial release of API Rate Limiter SDK
- Core `RateLimiter` class with three strategies:
  - Sliding Window Strategy
  - Fixed Window Strategy  
  - Token Bucket Strategy
- React hooks integration:
  - `useRateLimiter` - Basic rate limiting
  - `useRateLimitedAPI` - API requests with retry
  - `useBatchRateLimiter` - Batch processing
  - `useMultiRateLimiter` - Multiple API management
- TypeScript support with full type definitions
- Configurable callbacks (onRateLimit, onReset, onRequest)
- Custom `RateLimitError` with retry information
- Zero external dependencies (React as peer dependency)

### Features
- **Multiple Strategies**: Choose between sliding window, fixed window, or token bucket
- **React Integration**: Purpose-built hooks for React applications
- **TypeScript**: Full type safety and IntelliSense support
- **Flexible Configuration**: Customizable limits, windows, and behaviors
- **Advanced Features**: Automatic retry, batch processing, multi-API support
- **Performance Optimized**: Efficient algorithms with minimal overhead
- **Error Handling**: Comprehensive error handling with retry information

### Configuration Options
- `maxRequests`: Maximum requests per time window
- `windowMs`: Time window duration in milliseconds
- `strategy`: Rate limiting algorithm choice
- `retryAfter`: Default retry delay for rate limited requests
- `skipSuccessfulRequests`: Option to exclude successful requests from count
- `skipFailedRequests`: Option to exclude failed requests from count

### Supported Environments
- React 16.8.0+ (for hooks)
- TypeScript 4.0+
- Node.js 14+
- Modern browsers (ES2018+)

### Build System
- Rollup for bundling
- TypeScript compilation
- CommonJS and ESM output formats
- Source maps included
- Declaration files generated

### Documentation
- Comprehensive README with examples
- API reference documentation
- Strategy comparison guide
- Real-world usage examples
- Migration guide from other libraries

## [0.9.0] - 2024-01-10 (Beta)

### Added
- Beta release for testing
- Core rate limiting functionality
- Basic React hooks
- TypeScript definitions

### Changed
- Refined API based on beta feedback
- Improved performance characteristics
- Enhanced error handling

### Fixed
- Token bucket refill timing issues
- Sliding window memory optimization
- Hook dependency array optimizations

## [0.8.0] - 2024-01-05 (Alpha)

### Added
- Alpha release for early adopters
- Sliding window implementation
- Fixed window implementation
- Basic React integration

### Known Issues
- Token bucket strategy not yet implemented
- Limited error handling
- Performance not optimized

## Development Milestones

### Phase 1: Core Implementation ✅
- [x] Rate limiting algorithms
- [x] Basic configuration system
- [x] Error handling framework
- [x] TypeScript definitions

### Phase 2: React Integration ✅
- [x] Basic useRateLimiter hook
- [x] Advanced hooks (API, Batch, Multi)
- [x] State management
- [x] Callback system

### Phase 3: Advanced Features ✅
- [x] Multiple strategy support
- [x] Automatic retry logic
- [x] Batch processing
- [x] Multi-API management

### Phase 4: Production Ready ✅
- [x] Performance optimization
- [x] Memory management
- [x] Comprehensive testing
- [x] Documentation

### Phase 5: Enhanced Documentation 🚧
- [x] Quick start guide
- [x] API reference
- [x] Strategy comparison
- [x] Real-world examples
- [x] Migration guide
- [x] Troubleshooting guide
- [x] Performance guide
- [ ] Video tutorials
- [ ] Interactive examples

## Upcoming Features

### v1.1.0 (Planned)
- [ ] Persistent storage support (localStorage, Redis)
- [ ] Rate limit sharing across tabs/windows
- [ ] Advanced retry strategies (jitter, circuit breaker)
- [ ] Metrics and monitoring integration
- [ ] Rate limit warming/preloading

### v1.2.0 (Planned)
- [ ] Distributed rate limiting
- [ ] Custom strategy plugins
- [ ] Rate limit templates/presets
- [ ] Advanced analytics
- [ ] Performance profiling tools

### v2.0.0 (Future)
- [ ] Breaking changes for improved API
- [ ] WebWorker support
- [ ] Server-side rendering optimizations
- [ ] Advanced caching strategies
- [ ] Machine learning rate optimization

## Breaking Changes

### v1.0.0
- Initial stable API - no breaking changes from beta

### Future Breaking Changes
We are committed to semantic versioning. Any breaking changes will:
1. Be clearly documented
2. Include migration guides
3. Provide deprecation warnings in advance
4. Follow semantic versioning (major version bump)

## Security Updates

### v1.0.0
- No security vulnerabilities identified
- Regular security audits planned
- Dependency scanning implemented

## Performance Improvements

### v1.0.0
- Optimized sliding window cleanup algorithm
- Reduced memory footprint for token bucket
- Improved React hook re-render performance
- Minimized bundle size (< 10KB gzipped)

## Bug Fixes

### v1.0.0
- Fixed memory leak in sliding window strategy
- Resolved race condition in token bucket refill
- Corrected TypeScript definitions for callbacks
- Fixed hook cleanup on component unmount

## Contributors

- **JuTech Devs Team** - Initial development and maintenance
- **Community Contributors** - Bug reports, feature requests, and feedback

## Support

For support and questions:
- 📧 Email: support@jutech-devs.com
- 🐛 Issues: [GitHub Issues](https://github.com/jutech-devs/api-rate-limiter/issues)
- 📖 Documentation: [GitHub Wiki](https://github.com/jutech-devs/api-rate-limiter/wiki)
- 💬 Discussions: [GitHub Discussions](https://github.com/jutech-devs/api-rate-limiter/discussions)

## License

MIT License - see [LICENSE](./LICENSE) file for details.