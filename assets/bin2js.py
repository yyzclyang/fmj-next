#!/usr/bin/env python
import os
import sys

def encode(filename):
    basename = os.path.basename(filename)
    js = '''
    fmj.fs["%s"] = "%s";
    ''' % (basename, open(filename).read().encode('hex').upper())
    open(filename + '.js', 'w').write(js)

if __name__ == '__main__':
    for fn in sys.argv[1:]:
        encode(fn)

