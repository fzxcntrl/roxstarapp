#!/bin/bash

# Disable ALL malloc debugging to prevent system hanging
unset MallocNanoZone
export MallocStackLogging=0
export MallocScribble=0
export MallocPreScribble=0
export MallocGuardEdges=0
export MallocCheckHeapStart=0
export MallocCheckHeapEach=0
export MallocCorruptionAbort=0

# Clear any existing malloc debug settings
export MallocNanoZone=1

echo "🚀 Starting Next.js with malloc debugging disabled..."

# Start Next.js development server
next dev