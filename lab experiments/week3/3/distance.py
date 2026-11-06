import numpy as np
from scipy.spatial import distance
pointA=np.array([2,4,6])
pointB=np.array([5,1,9])
euclidean_dist=distance.euclidean(pointA,pointB)
print("Eclidean Distance:" ,euclidean_dist)
similarity_euclidean=1/(1+euclidean_dist)
print("Eucleidean Similarity:", similarity_euclidean)

