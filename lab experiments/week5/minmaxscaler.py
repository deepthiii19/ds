import pandas as pd
from sklearn.preprocessing import MinMaxScaler
data=pd.DataFrame({
    'A':[10,20,30,40,50],
    'B':[5,15,25,35,45]

})
print(data)
scaler = MinMaxScaler()
normalized_data=scaler.fit_transform(data)
normalized_df=pd.DataFrame(normalized_data,columns= data.columns)
print("Normalized Data (Min-Max Scaling)")
print(normalized_df)
