# Pre build
rm -rf build && mkdir build

# Build 
tsc

# Post build
cp package.json build/package.json; 
cp README.md build/README.md; 

# Publish
cd build 
yalc publish