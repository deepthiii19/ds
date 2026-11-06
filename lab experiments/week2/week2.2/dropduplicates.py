import pandas as pd
df=pd.DataFrame({
    'ID':[1,2,2,3,4,4],
    'Name':['Anushka','Nani','Nani','Bob','DQ','DQ'],
    'Age':[25,30,30,35,40,40]
})
print("Original data\n",df)
df_exact=df.drop_duplicates()
print("\nAfter Exact Match Removal:\n",df_exact)