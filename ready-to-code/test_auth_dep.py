import boto3

# This script demonstrates login-required dependency handling
# When run, it should detect boto3 as requiring authentication
# and show setup instructions instead of trying to install it

print("Testing login-required dependency detection...")
print("If boto3 is not installed, the extension should show setup instructions")