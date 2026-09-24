a="My name is {fname},I'm {age}".format(fname="John",age=36)
print(a)

a,b,c=map(int,input().split())
if a>=b and a>=c:
    print(a)
elif b>=c and b>=a:
    print(b)
else:
    print(c)
