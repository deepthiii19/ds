import numpy as np
from scipy.spatial import distance
pointA=np.array([1,7,9])
pointB=np.array([3,2,6])
md=distance.cityblock(pointA,pointB)
print("Manhattan distance:",md)
s=1/(1+md)
print(s)