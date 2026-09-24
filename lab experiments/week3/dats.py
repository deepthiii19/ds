import pandas as pd
data={'col 1':[3,2,1,0],'col 2':['a','b','c','d']}
pd.DataFrame.from_dict(data)
data={'row 1':[3,2,1,0],'row 2':['a','b','c','d']}
pd.DataFrame.from_dict(data,orient='index')
data={'row 1':[3,2,1,0],'row 2':['a','b','c','d']}
pd.DataFrame.from_dict(data,orient='index',columns=['A','B','C','D'])

print(data)