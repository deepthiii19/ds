import pandas as pd
data=[1,2,3,4,50,10]
df=pd.DataFrame(data)
print(df)

data={'Name':['Anush','Rohit'],'Age':[20,21]}
df=pd.DataFrame(data)
print(df.to_csv('my.csv',index=True))
data={'col 1':[3,2,1,0],'col 2':['a','b','c','d']}
pd.DataFrame.from_dict(data)
data={'row 1':[3,2,1,0],'row 2':['a','b','c','d']}
pd.DataFrame.from_dict(data,orient='index')
data={'row 1':[3,2,1,0],'row 2':['a','b','c','d']}
pd.DataFrame.from_dict(data,orient='index',columns=['A','B','C','D'])
