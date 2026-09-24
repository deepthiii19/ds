import pandas as pd
data={'std roll':[448,449,359,985,442,367,250,320,348,220],
      'std name':['Anush','Vysh','Roops','Zwara','Thans','Sarvani','Sam','Jaw','Kay','Ambani'],
      'std age':[19,19,20,19,20,20,19,20,20,21],
      'std sec':['A','A','B','A','B','D','F','C','C','F'],
      'QC marks':[50,50,45,45,30,49,35,30,50,48],
      'DS marks':[50,50,49,44,35.5,40,41,30,30,50],
      'TOC marks':[50,50,50,49,33,48,50,38,39,44]

      }
df=pd.DataFrame.from_dict(data,orient='index',columns=['1','2','3','4','5','6','7','8','9','10'])
print(df)
print(df.to_csv('clg.csv',index=True))