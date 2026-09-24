import numpy as np
from scipy.spatial import distance
pointA=np.array([2,4,6])
pointB=np.array([5,1,9])
mini_dist=distance.minkowski(pointA,pointB,p=33)
print("Minikowsi distance:",mini_dist)
sm=1/(1+mini_dist)
print(sm)
md=distance.cityblock(pointA,pointB)
print("Manhattan distance:",md)
s=1/(1+md)
print(s)
euclidean_dist=distance.euclidean(pointA,pointB)
print("Eclidean Distance:" ,euclidean_dist)
similarity_euclidean=1/(1+euclidean_dist)
print("Eucleidean Similarity:", similarity_euclidean)

