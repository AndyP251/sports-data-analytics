from django.db import migrations, models
import django.utils.timezone

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='CoreBiometricData',
            name='start_time',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='strain',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='kilojoules',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='spo2_percentage',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='skin_temp_celsius',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='respiratory_rate',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='sleep_efficiency',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='sleep_consistency',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='sleep_performance',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='sleep_disturbances',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='sleep_cycle_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='no_data_seconds',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='total_in_bed_seconds',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='baseline_sleep_seconds',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='need_from_sleep_debt_seconds',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='need_from_recent_strain_seconds',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='CoreBiometricData',
            name='need_from_recent_nap_seconds',
            field=models.IntegerField(default=0),
        ),
    ] 