import numpy as np
p=np.array([[1,2,3,4,5,6],
           [7,8,9,3,9,4]])
print(p[0:2,2:5])
print(p.shape)
k=p.reshape(3,4)
print(k)