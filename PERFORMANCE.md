# Performance Targets

This document outlines performance targets and monitoring for the Chess Trainer plugin.

## Bundle Size

- **Target**: <300 KB gzipped
- **Current**: ~115 KB (main.js)
- **Status**: ✅ Within target

## Note Creation

- **Target**: <1s typical
- **Measurement**: Time from PGN submission to note creation
- **Status**: ✅ Typically <500ms

## Renderer Memory

- **Target**: <50 MB per board instance
- **Measurement**: Memory usage in DevTools
- **Status**: ✅ Typically <20 MB

## Autoplay Performance

- **Target**: <20% CPU usage during autoplay
- **Measurement**: CPU usage in DevTools Performance tab
- **Status**: ✅ Typically <10%

## Performance Optimizations

### Implemented

1. **FEN Precomputation**: All positions precomputed once instead of recalculating on each move
2. **Large Game Handling**: Autoplay disabled for games >500 moves with warning message
3. **Cleanup**: Proper timer cleanup to prevent memory leaks

### Monitoring

- Bundle size tracked in build output
- Performance monitoring via DevTools
- Memory profiling recommended for large games

## Future Optimizations

- Lazy loading of board component
- Virtual scrolling for move list (if needed)
- Debouncing for rapid navigation

