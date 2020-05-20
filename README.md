# s3size

A quick, hacky, but reliable and FAST (for any bucket) tool to list all S3 buckets and their respective sizes for a given AWS account.

## This has been done before

I was unable to find a fast enough solution which did not make extraneous calls. This solution will only make 2 calls as of writing this. One to get a list of available bucket size metrics, and another to get data from all of them at once.

The priorities of this implementation are:
- Easy and fast support for accounts with a few BIG buckets
- Support for accounts with too many buckets to list
- Simplicity, modularity, <100 SLOC per major feature

## Requirements

All you need is a configured AWS profile (`aws configure help`) and permission to list & read Cloudwatch Metrics.

Uses only `aws-sdk`.

## Questions?

### Will this work for buckets with 1000+ Yottabytes?

Yes! Quickly and cheaply.

### I want this as a library

That is my next priority, but PRs are welcome.

### Will this work for 1000+ buckets?

Soon, you just need to handle pagination on the second (and possibly the first) API call. It's about 30-45 mins of work in total.
