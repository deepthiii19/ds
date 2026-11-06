import pandas as pd
data={'apple':[3,2,0,1],'orange':[0,3,7,2]}
df=pd.DataFrame(data,index=['A','B','C','D'])

print(df.loc['A'])
