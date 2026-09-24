import pandas  as pd
from sklearn.preprocessing import MinMaxScaler
df=pd.DataFrame({'Color' : ['Red','Blue','Green','Red','Blue']})
one_hot=pd.get_dummies(df,columns=['Color'])
print("\nOne-Hot Encoding")
print(one_hot)