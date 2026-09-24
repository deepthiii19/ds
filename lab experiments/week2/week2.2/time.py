import pandas as pd
df=pd.DataFrame({
    'Date':['2007-03-19','19/03/2007','Mar 19,2007','2007.03.19']
})
print("Original Data:\n",df)
df['Date']=pd.to_datetime(df['Date'],errors='coerce').dt.strftime('%Y-%m-%d')
print(df)