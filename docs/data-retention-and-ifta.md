# Data retention and IFTA

FuelTrail stores original receipt images and structured purchase records. Organization `retention_years` cannot be set below **4**, matching common IFTA record-keeping expectations.

IFTA still requires:

1. Fuel purchase records (what this product exports)
2. Distance traveled in each jurisdiction (not calculated here)

The worksheet and CSV therefore carry this permanent note:

> Fuel purchase worksheet only. A complete IFTA return also requires distance traveled in each jurisdiction.

CSV exports use a UTF-8 BOM, ISO timestamps, and RFC-style quoting so Excel opens them cleanly.

Authoritative references:

- [Iowa DOT IFTA record keeping](https://iowadot.gov/motor-carriers/ifta-international-fuel-tax-agreement/ifta-record-keeping-requirements)
- [IFTA, Inc.](https://www.iftach.org/)
